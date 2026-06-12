import React, { useEffect, useRef, useState } from "react";
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
import { date2digits, secondsToUserDateString, time2digits } from "../../TimeHelper";
import Store from "../../Store";
import drawDataGapLines from "./uplotHooks/drawDataGapLines";
import uPlot from "uplot";

function getGraphColor(idx, _fill) {
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

function CompareView(props) {
    const getDataKey = () => {
        const params = new URLSearchParams(location.search);
        return params.get("unit") || "temperature_C";
    }

    let sensors = props.sensors;
    const [sensorData, setSensorData] = useState([])
    const [loading, setLoading] = useState(false)
    const [zoom, setZoom] = useState(undefined)
    const ref = useRef(null);

    const touchZoomStateRef = useRef(undefined);
    const wasTouchZoomingRef = useRef(false);
    const fromComponentUpdateRef = useRef(false);
    const isTouchZoomingRef = useRef(false);

    const dataKey = getDataKey();
    const prevDataKeyRef = useRef(dataKey);
    const dataKeyChangedRef = useRef(false);
    useEffect(() => {
        if (prevDataKeyRef.current !== dataKey) {
            dataKeyChangedRef.current = true;
        }
        prevDataKeyRef.current = dataKey;
    }, [dataKey]);


    const getGraphData = () => {
        if (!sensorData) return [];
        let dataKey = getSensorTypeOnly(getDataKey()) || "";
        let unit = getUnitOnly(getDataKey()) || null;
        let settings = undefined
        if (unit) {
            if (dataKey === "temperature" && unit) {
                settings = { UNIT_TEMPERATURE: unit }
            }
            if (dataKey === "humidity") {
                // Handle dew point temperature variants (e.g. unit "2C", "2F", "2K")
                if (unit && unit.startsWith("2") && unit.length > 1) {
                    settings = { UNIT_HUMIDITY: "2", UNIT_TEMPERATURE: unit.substring(1) }
                } else {
                    settings = { UNIT_HUMIDITY: unit }
                }
            }
            if (dataKey === "pressure") {
                settings = { UNIT_PRESSURE: unit }
            }
        }
        const oneHourInSeconds = 3600;
        let tableData = [];
        const unitHelper = getUnitHelper(dataKey);
        sensorData.forEach(data => {
            let thisSensorsData = [[], []];
            if (data.measurements.length) {
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
                        const timeDifference = timestamp - prevTimestamp;

                        if (timeDifference >= oneHourInSeconds) {
                            let insertTime = prevTimestamp + 1;
                            thisSensorsData[0].push(insertTime);
                            thisSensorsData[1].push(null);
                        }
                    }
                    if (Number.isNaN(value)) value = null;
                    thisSensorsData[0].push(timestamp);
                    thisSensorsData[1].push(value);

                }
            }

            tableData.push(thisSensorsData);
        });

        if (tableData.length) {
            return uPlot.join(tableData, tableData.map(t => t.map(_s => 2)))
        }
        return [];
    };

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

    useEffect(() => {
        fromComponentUpdateRef.current = true;
    }, [zoom]);

    function getXRange() {
        return [props.from, props.to || new Date().getTime() / 1000]
    }

    const { width } = useContainerDimensions(ref)
    const colorMode = useColorMode().colorMode;
    let showDots = Store.getGraphDrawDots()
    //if (loading) return <Box height={450}><Progress isIndeterminate /></Box>
    let graphData = getGraphData();
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
                        options={{
                            plugins: [UplotTouchZoomPlugin(getXRange(), (isZooming) => {
                                isTouchZoomingRef.current = isZooming
                                wasTouchZoomingRef.current = true;
                            })],
                            padding: [10, 10, 0, -10],
                            width: width,
                            height: 450,
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
                                y: {
                                    range: (_, fromY, toY) => {
                                        fromY -= 0.5
                                        toY += 0.5
                                        return [fromY, toY]
                                    }
                                }, x: {
                                    //range: getXRange(),
                                    range: (_, fromX, toX) => {
                                        let propFrom = props.from
                                        let propTo = props.to
                                        if (!propFrom || !propTo) {
                                            return getXRange()
                                        }

                                        if (isTouchZoomingRef.current) {
                                            // if zoom is close enought to full x range, assume fully zoomed out
                                            if (Math.abs(fromX - propFrom / 1000) < 1 && Math.abs(toX - propTo / 1000) < 1) {
                                                touchZoomStateRef.current = "reset"
                                            } else {
                                                touchZoomStateRef.current = [fromX, toX]
                                            }
                                            return [fromX, toX]
                                        }

                                        if (wasTouchZoomingRef.current) {
                                            if (touchZoomStateRef.current) {
                                                if (touchZoomStateRef.current === "reset") {
                                                    setZoom(undefined);
                                                    touchZoomStateRef.current = undefined
                                                    return getXRange()
                                                }
                                                setZoom(touchZoomStateRef.current)
                                                touchZoomStateRef.current = undefined
                                            }
                                            wasTouchZoomingRef.current = false;
                                            if (zoom && fromComponentUpdateRef.current) {
                                                fromComponentUpdateRef.current = false;
                                                return zoom;
                                            }
                                            if (!fromComponentUpdateRef.current && Number.isInteger(fromX) && Number.isInteger(toX)) {
                                                setZoom(undefined)
                                                return getXRange()
                                            }
                                            return [fromX, toX]
                                        }

                                        if (zoom && fromComponentUpdateRef.current) {
                                            fromComponentUpdateRef.current = false;
                                            return zoom;
                                        }
                                        if (Number.isInteger(fromX) && Number.isInteger(toX)) {
                                            if (dataKeyChangedRef.current) {
                                                dataKeyChangedRef.current = false;
                                                return zoom || getXRange();
                                            }
                                            setZoom(undefined);
                                            return getXRange();
                                        } else {
                                            setZoom([fromX, toX]);
                                            return [fromX, toX];
                                        }
                                    }
                                }
                            },
                            hooks: {
                                drawSeries: [(u, si) => drawDataGapLines(u, si, getGraphColor(si - 1))],
                            },
                            axes: [
                                {
                                    grid: { show: false },
                                    font: "12px Arial",
                                    stroke: ruuviTheme.graph.axisLabels[colorMode],
                                    values: (_, ticks) => {
                                        var xRange = ticks[ticks.length - 1] - ticks[0]
                                        var xRangeHours = xRange / 60 / 60
                                        var prevRaw = null;
                                        var useDates = xRangeHours >= 72;
                                        return ticks.map(raw => {
                                            var out = useDates ? date2digits(raw) : time2digits(raw);
                                            if (prevRaw === out) {
                                                if (useDates) return time2digits(raw);
                                                return null;
                                            }
                                            prevRaw = out;
                                            return out;
                                        })
                                    }
                                }, {
                                    grid: { stroke: ruuviTheme.graph.grid[colorMode], width: 2 },
                                    stroke: ruuviTheme.graph.axisLabels[colorMode],
                                    size: 55,
                                    font: "12px Arial",
                                }
                            ],
                        }}
                        data={graphData}
                        onCreate={(_chart) => { }}
                        onDelete={(_chart) => { }}
                    />
                )}
        </div>
    )
}

export const useContainerDimensions = myRef => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const getDimensions = () => ({
            width: myRef.current.offsetWidth,
            height: myRef.current.offsetHeight
        })

        const handleResize = () => {
            setDimensions(getDimensions())
        }

        if (myRef.current) {
            setDimensions(getDimensions())
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [myRef])

    return dimensions;
};

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