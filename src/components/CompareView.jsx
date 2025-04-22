import React, { useEffect, useRef, useState } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import pjson from '../../package.json';
import NetworkApi from "../NetworkApi";
import parse from "../decoder/parser";
import { ruuviTheme } from "../themes";
import { Box, Spinner, useColorMode } from "@chakra-ui/react";
import { t } from "i18next";
import { getSensorTypeOnly, getUnitHelper, getUnitOnly } from "../UnitHelper";
import UplotTouchZoomPlugin from "./uplotPlugins/UplotTouchZoomPlugin";
import UplotLegendHider from "./uplotPlugins/UplotLegendHider";
import { date2digits, secondsToUserDateString, time2digits } from "../TimeHelper";
import Store from "../Store";

function getGraphColor(idx, fill) {
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

var gdata = []
var touchZoomState = undefined
var wasTouchZooming = false
var fromComponentUpdate = false
var isTouchZooming = false

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

    const dataKey = getDataKey();
    const prevDataKeyRef = useRef(dataKey);
    const dataKeyChangedRef = useRef(false);
    useEffect(() => {
        if (prevDataKeyRef.current !== dataKey) {
            dataKeyChangedRef.current = true;
        }
        prevDataKeyRef.current = dataKey;
    }, [dataKey]);

    const getUniqueKeys = () => {
        let uniqueKeysSet = new Set();
        for (let i = 0; i < sensorData.length; i++) {
            let key = sensorData[i].name || sensorData[i].mac;
            uniqueKeysSet.add(key);
        }
        return Array.from(uniqueKeysSet);
    }

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
                settings = { UNIT_HUMIDITY: unit }
            }
            if (dataKey === "pressure") {
                settings = { UNIT_PRESSURE: unit }
            }
        }
        gdata = []
        let pd = [[], []];
        const timestampIndexMap = {}
        const unitHelper = getUnitHelper(dataKey);
        sensorData.forEach(data => {
            if (data.measurements.length) {
                let d = data

                if (pd.length < sensors.length + 2) pd.push([]);

                for (let j = 0; j < d.measurements.length; j++) {
                    if (!d.measurements[j].parsed) continue;
                    const timestamp = d.measurements[j].timestamp;

                    let value;
                    switch (dataKey) {
                        case "temperature":
                            value = unitHelper.value(d.measurements[j].parsed[dataKey], undefined, settings)
                            break
                        case "humidity":
                            value = unitHelper.value(d.measurements[j].parsed[dataKey], d.measurements[j].parsed.temperature, settings)
                            break
                        default:
                            value = unitHelper.value(d.measurements[j].parsed[dataKey], settings)
                            break
                    }

                    if (timestamp in timestampIndexMap) {
                        // Update existing entry in gdata
                        gdata[timestampIndexMap[timestamp]][d.name || d.mac] = value;
                    } else {
                        // Add new entry to gdata
                        gdata.push({
                            t: timestamp,
                            [d.name || d.mac]: value,
                        });

                        // Update timestampIndexMap
                        timestampIndexMap[timestamp] = gdata.length - 1;
                    }
                }
            }
        });
        let uniqueKeysArray = getUniqueKeys();

        let keyIndexMap = {};
        let d = [[]];

        gdata.sort((a, b) => a.t - b.t);

        d[0] = gdata.map(entry => entry.t);

        uniqueKeysArray.forEach((key, index) => {
            keyIndexMap[key] = index + 1;
            d.push([]);
        });

        for (let i = 0; i < gdata.length; i++) {
            for (let j = 0; j < uniqueKeysArray.length; j++) {
                d[keyIndexMap[uniqueKeysArray[j]]].push(gdata[i][uniqueKeysArray[j]]);
            }
        }

        return d;
    };

    useEffect(() => {
        (async () => {
            setLoading(true)
            props.isLoading(true)
            setSensorData([])
            gdata = []

            for (const sensor of sensors) {
                let until = props.to
                let since = props.from;
                let allData = null;
                let stop = false
                for (; ;) {
                    if (since >= until || stop) {
                        break;
                    }
                    let data = await new NetworkApi().getAsync(sensor, since, until, { limit: pjson.settings.dataFetchPaginationSize });
                    if (data.result === "success") {
                        data.data.measurements = data.data.measurements.filter((item) => {
                            return item.timestamp >= since && item.timestamp <= until;
                        });
                        if (!allData) allData = data;
                        else allData.data.measurements = allData.data.measurements.concat(data.data.measurements);

                        let returndDataLength = data.data.measurements.length;
                        if (data.data.nextUp) until = data.data.nextUp;
                        else if (data.data.fromCache) until = data.data.measurements[data.data.measurements.length - 1].timestamp;
                        else if (returndDataLength >= pjson.settings.dataFetchPaginationSize) until = data.data.measurements[data.data.measurements.length - 1].timestamp;
                        else stop = true

                        let d = parse(allData.data);
                        setSensorData((s) => {
                            if (!s) s = [];
                            let updated = false;
                            const newData = s.map(item => {
                                if (item.sensor === sensor) {
                                    updated = true;
                                    return d; // Replace the existing data for the sensor
                                }
                                return item;
                            });

                            if (!updated) {
                                newData.push(d); // Add new data if the sensor was not found
                            }

                            return newData;
                        });
                    }
                }
            }

            setLoading(false);
            props.isLoading(false);
        })();
    }, [sensors, props.to, props.from, props.reloadIndex]);

    useEffect(() => {
        props.setData(sensorData);
    }, [sensorData]);

    useEffect(() => {
        fromComponentUpdate = true;
    }, [zoom]);

    function getXRange() {
        return [props.from, props.to || new Date().getTime() / 1000]
    }

    const { width } = useContainerDimensions(ref)
    const colorMode = useColorMode().colorMode;
    let showDots = new Store().getGraphDrawDots()
    //if (loading) return <Box height={450}><Progress isIndeterminate /></Box>
    let graphData = getGraphData();
    return (
        <div ref={ref}>
            {loading &&
                <div style={graphLoadingOverlay}>
                    <div style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: "100%", textAlign: "center" }}><div style={{ position: "relative", top: "45%" }}><Spinner size="xl" /></div></div>
                </div>
            }
            {JSON.stringify(zoom)}
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
                                isTouchZooming = isZooming
                                wasTouchZooming = true;
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
                                        console.log("from-to", fromX, toX)
                                        let propFrom = props.from
                                        let propTo = props.to
                                        if (!propFrom || !propTo) {
                                            console.log("no prop from or to")
                                            return getXRange()
                                        }

                                        if (isTouchZooming) {
                                            // if zoom is close enought to full x range, assume fully zoomed out
                                            if (Math.abs(fromX - propFrom / 1000) < 1 && Math.abs(toX - propTo / 1000) < 1) {
                                                console.log("touch zoom reset")
                                                touchZoomState = "reset"
                                            } else {
                                                touchZoomState = [fromX, toX]
                                            }
                                            return [fromX, toX]
                                        }

                                        if (wasTouchZooming) {
                                            if (touchZoomState) {
                                                if (touchZoomState === "reset") {
                                                    console.log("touch zoom reset")
                                                    setZoom(undefined);
                                                    touchZoomState = undefined
                                                    return getXRange()
                                                }
                                                setZoom(touchZoomState)
                                                touchZoomState = undefined
                                            }
                                            wasTouchZooming = false;
                                            if (zoom && fromComponentUpdate) {
                                                fromComponentUpdate = false;
                                                console.log("touch keep zoom")
                                                return zoom;
                                            }
                                            if (!fromComponentUpdate && Number.isInteger(fromX) && Number.isInteger(toX)) {
                                                console.log("touch zoom reset")
                                                setZoom(undefined)
                                                return getXRange()
                                            }
                                            return [fromX, toX]
                                        }



                                        if (zoom && fromComponentUpdate) {
                                            fromComponentUpdate = false;
                                            //console.log("keep zoom")
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
                        onCreate={(chart) => { }}
                        onDelete={(chart) => { }}
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