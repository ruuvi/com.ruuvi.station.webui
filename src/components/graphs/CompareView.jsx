import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import pjson from '../../../package.json';
import NetworkApi from "../../NetworkApi";
import decoder from "../../decoder/decode";
import { ruuviTheme } from "../../themes";
import { Box, Spinner, useColorMode } from "@chakra-ui/react";
import { t } from "i18next";
import { getSensorTypeOnly, getUnitHelper, getUnitOnly, round } from "../../UnitHelper";
import UplotTouchZoomPlugin from "./uplotPlugins/UplotTouchZoomPlugin";
import { secondsToUserDateString } from "../../TimeHelper";
import Store from "../../Store";
import drawDataGapLines from "./uplotHooks/drawDataGapLines";
import uPlot from "uplot";
import useGraphZoom from "./useGraphZoom";
import useContainerDimensions from "./useContainerDimensions";
import { makeXAxis, makeYAxis } from "./graphAxes";

function getGraphColor(idx) {
    const colors = [
        "#01b9a8",
        "#f77a61",
        "#d62bb6",
        "#9f2be2",
        "#5273e8",
        "#82d182"
    ]
    let color = colors[idx % colors.length]

    if (idx >= colors.length) {
        return `rgba(${parseInt(color.slice(-6, -4), 16)}, ${parseInt(color.slice(-4, -2), 16)}, ${parseInt(color.slice(-2), 16)}, 0.5)`;
    }
    return color
}

const graphLoadingOverlay = {
    position: "absolute",
    width: "100%",
    height: "450px",
    zIndex: 1,
}

// Unit settings encoded in the compare URL, e.g. "humidity_2C" means dew
// point in Celsius.
function getUnitSettings(dataKey, unit) {
    if (!unit) return undefined;
    if (dataKey === "temperature") {
        return { UNIT_TEMPERATURE: unit };
    }
    if (dataKey === "humidity") {
        if (unit.startsWith("2") && unit.length > 1) {
            return { UNIT_HUMIDITY: "2", UNIT_TEMPERATURE: unit.substring(1) };
        }
        return { UNIT_HUMIDITY: unit };
    }
    if (dataKey === "pressure") {
        return { UNIT_PRESSURE: unit };
    }
    return undefined;
}

// Converts each sensor's measurements to uPlot series in the selected unit
// (with null markers in time gaps) and joins them on a shared x-axis.
function buildGraphData(sensorData, fullDataKey) {
    if (!sensorData || !sensorData.length) return [];

    const dataKey = getSensorTypeOnly(fullDataKey) || "";
    const settings = getUnitSettings(dataKey, getUnitOnly(fullDataKey) || null);
    const oneHourInSeconds = 3600;
    const unitHelper = getUnitHelper(dataKey);

    const tableData = sensorData.map(data => {
        const thisSensorsData = [[], []];
        // Measurements are already sorted ascending from the fetch loop
        for (let j = 0; j < data.measurements.length; j++) {
            if (!data.measurements[j].parsed) continue;
            const timestamp = data.measurements[j].timestamp;

            let value;
            switch (dataKey) {
                case "temperature":
                    value = unitHelper.value(data.measurements[j].parsed[dataKey], undefined, settings)
                    break
                case "humidity":
                    value = unitHelper.value(data.measurements[j].parsed[dataKey], data.measurements[j].parsed.temperature, settings)
                    break
                default:
                    value = unitHelper.value(data.measurements[j].parsed[dataKey], settings)
                    break
            }

            if (j > 0) {
                const prevTimestamp = data.measurements[j - 1].timestamp;
                if (timestamp - prevTimestamp >= oneHourInSeconds) {
                    thisSensorsData[0].push(prevTimestamp + 1);
                    thisSensorsData[1].push(null);
                }
            }
            if (Number.isNaN(value)) value = null;
            thisSensorsData[0].push(timestamp);
            thisSensorsData[1].push(value);
        }
        return thisSensorsData;
    });

    return uPlot.join(tableData, tableData.map(t => t.map(_s => 2)))
}

function CompareView(props) {
    let sensors = props.sensors;
    const [sensorData, setSensorData] = useState([])
    const [loading, setLoading] = useState(false)
    const ref = useRef(null);

    const params = new URLSearchParams(location.search);
    const fullDataKey = params.get("unit") || "temperature_C";

    useEffect(() => {
        (async () => {
            setLoading(true)
            props.isLoading(true)
            setSensorData([])

            for (const sensor of sensors) {
                // Check if cancelled
                if (props.cancelRef?.current) {
                    break;
                }

                let until = props.to
                let since = props.from;
                let allMeasurements = [];
                let sensorMeta = null;
                let stop = false
                for (; ;) {
                    // Check if cancelled
                    if (props.cancelRef?.current) {
                        stop = true;
                        break;
                    }

                    if (since >= until || stop) {
                        break;
                    }
                    let data = await new NetworkApi().getAsync(sensor, since, until, { limit: pjson.settings.dataFetchPaginationSize });
                    if (data.result === "success") {
                        let newMeasurements = data.data.measurements.filter((item) => {
                            return item.timestamp >= since && item.timestamp <= until;
                        });

                        // Decode only the new chunk (not all accumulated data)
                        newMeasurements.forEach(x => {
                            x.parsed = decoder(x.data);
                            if (x.parsed) x.parsed.rssi = x.rssi;
                        });
                        newMeasurements = newMeasurements.filter(x => x.parsed !== null);

                        // Apply offsets to new chunk only
                        const { offsetTemperature = 0, offsetHumidity = 0, offsetPressure = 0 } = data.data;
                        if (offsetTemperature !== 0 || offsetHumidity !== 0 || offsetPressure !== 0) {
                            for (const m of newMeasurements) {
                                if (offsetTemperature !== 0 && m.parsed.temperature !== undefined) {
                                    m.parsed.temperature = round(m.parsed.temperature + offsetTemperature, 2);
                                }
                                if (offsetHumidity !== 0 && m.parsed.humidity !== undefined) {
                                    m.parsed.humidity = round(m.parsed.humidity + offsetHumidity, 2);
                                }
                                if (offsetPressure !== 0 && m.parsed.pressure !== undefined) {
                                    m.parsed.pressure = round(m.parsed.pressure + offsetPressure, 2);
                                }
                            }
                        }

                        // Accumulate with push instead of concat (avoids quadratic copying)
                        allMeasurements.push(...newMeasurements);

                        // Store metadata from first response
                        if (!sensorMeta) {
                            let { measurements: _measurements, ...meta } = data.data;
                            sensorMeta = meta;
                        }

                        // Update pagination cursor
                        let returndDataLength = data.data.measurements.length;
                        if (data.data.nextUp) until = data.data.nextUp;
                        else if (data.data.fromCache) until = data.data.measurements[data.data.measurements.length - 1].timestamp;
                        else if (returndDataLength >= pjson.settings.dataFetchPaginationSize) until = data.data.measurements[data.data.measurements.length - 1].timestamp;
                        else stop = true

                        // Sort ascending and build sensor data object
                        allMeasurements.sort((a, b) => a.timestamp - b.timestamp);

                        let d = {
                            ...sensorMeta,
                            measurements: allMeasurements.slice(),
                            sensor: sensorMeta.sensor || sensor,
                            latestTimestamp: allMeasurements.length ? allMeasurements[allMeasurements.length - 1].timestamp : undefined,
                        };

                        setSensorData((s) => {
                            if (!s) s = [];
                            let updated = false;
                            const newData = s.map(item => {
                                if (item.sensor === sensor) {
                                    updated = true;
                                    return d;
                                }
                                return item;
                            });

                            if (!updated) {
                                newData.push(d);
                            }

                            return newData;
                        });
                    }
                }
            }

            setLoading(false);
            props.isLoading(false);
        })();
    }, [sensors, props.to, props.from, props.reloadIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        props.setData(sensorData);
    }, [sensorData]); // eslint-disable-line react-hooks/exhaustive-deps

    // Latest prop values for the callbacks living inside the memoized uPlot
    // options, which would otherwise close over stale values.
    const live = useRef({});
    live.current.from = props.from;
    live.current.to = props.to;

    const getXRange = useCallback(() => {
        const { from, to } = live.current;
        return [from, to || new Date().getTime() / 1000];
    }, []);

    const { xRange, yRange, onTouchZoom } = useGraphZoom({
        dataKey: fullDataKey,
        getXRange,
        hasFixedRange: !!(props.from && props.to),
    });

    const graphData = useMemo(
        () => buildGraphData(sensorData, fullDataKey),
        [sensorData, fullDataKey]
    );

    const { width } = useContainerDimensions(ref)
    const colorMode = useColorMode().colorMode;
    const showDots = Store.getGraphDrawDots()
    const seriesKey = sensorData.map(x => x.name || x.sensor).join("|");

    // uplot-react re-creates the whole chart when anything but width/height
    // changes in the options, so keep this object as stable as possible;
    // progressively loaded data then flows through the cheaper setData path.
    const baseOptions = useMemo(() => ({
        plugins: [UplotTouchZoomPlugin(getXRange(), onTouchZoom)],
        padding: [10, 10, 0, -10],
        series: [
            {
                label: t('time'),
                class: "graphLabel",
                value: (_, ts) => secondsToUserDateString(ts),
            },
            ...sensorData.map((x, i) => {
                return {
                    label: x.name || x.sensor,
                    points: { show: showDots, size: 3, fill: getGraphColor(i) },
                    class: "graphLabel",
                    spanGaps: false,
                    stroke: getGraphColor(i),
                }
            })
        ],
        scales: {
            y: { range: yRange },
            x: { range: xRange },
        },
        hooks: {
            drawSeries: [(u, si) => drawDataGapLines(u, si, getGraphColor(si - 1))],
        },
        axes: [
            makeXAxis(colorMode),
            makeYAxis(colorMode, { size: 55 }),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [seriesKey, colorMode, showDots]);

    const options = useMemo(
        () => ({ ...baseOptions, width, height: 450 }),
        [baseOptions, width]
    );

    return (
        <div ref={ref}>
            {loading &&
                <div style={graphLoadingOverlay}>
                    <div style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: "100%", textAlign: "center" }}><div style={{ position: "relative", top: "45%" }}><Spinner size="xl" /></div></div>
                </div>
            }
            {!graphData.length ?
                <Box height={450}>
                    <center style={{ paddingTop: 240, height: 450 }} className="nodatatext">
                        {t("no_data_in_range")}
                    </center>
                </Box>
                : (
                    <UplotReact
                        options={options}
                        data={graphData}
                    />
                )}
        </div>
    )
}

export function EmptyGraph() {
    const ref = useRef(null);
    const { width } = useContainerDimensions(ref)
    const colorMode = useColorMode().colorMode;
    return <div ref={ref}>
        <UplotReact options={{
            padding: [10, 10, 0, -10],
            width: width,
            height: 450,
            series: [
                {
                    class: "hide"
                },
            ],
            axes: [
                {
                }, {
                    grid: { stroke: ruuviTheme.graph.grid[colorMode], width: 2 },
                    stroke: "rgba(0,0,0,0)",
                }
            ],
            scales: {
                y: {
                    range: [0, 100],
                    values: () => "",
                },
            },
        }} />
    </div>
}

export default CompareView
