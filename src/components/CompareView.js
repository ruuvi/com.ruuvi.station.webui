import { Progress } from "@chakra-ui/progress";
import React, { useEffect, useRef, useState } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import pjson from '../../package.json';
import NetworkApi from "../NetworkApi";
import parse from "../decoder/parser";
import { ruuviTheme } from "../themes";
import { Box, useColorMode } from "@chakra-ui/react";
import { t } from "i18next";

function ddmm(ts) {
    var d = new Date(ts * 1000);
    return d.getDate() + "." + (d.getMonth() + 1) + "."
}

function hhmm(ts) {
    var d = new Date(ts * 1000);
    if (d.getHours() === 0 && d.getMinutes() === 0) return ddmm(ts)
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)
}

function getGraphColor(idx, fill) {
    const colors = [
        "#01b9a8",
        "#e5d16e",
        "#f77a61",
        "#d62bb6",
        "#9f2be2",
        "#5273e8",
        "#82d182"
    ]
    let color = colors[idx % colors.length]

    if (fill) {
        return `rgba(${parseInt(color.slice(-6, -4), 16)}, ${parseInt(color.slice(-4, -2), 16)}, ${parseInt(color.slice(-2), 16)}, 0.0)`;
    }

    return color
}

var gdata = []
function CompareView(props) {
    let sensors = props.sensors;
    const [sensorData, setSensorData] = useState([])
    const [loading, setLoading] = useState(false)
    const ref = useRef(null);

    const getUniqueKeys = () => {
        let uniqueKeysSet = new Set();
        gdata.forEach(obj => {
            Object.keys(obj).forEach(key => {
                if (key !== "t") uniqueKeysSet.add(key);
            });
        });
        return Array.from(uniqueKeysSet);
    }

    const getGraphData = () => {
        let uniqueKeysArray = getUniqueKeys();

        let keyIndexMap = {};
        let d = [[]];

        gdata.sort((a, b) => a.t - b.t);

        d[0] = gdata.map(entry => entry.t);

        uniqueKeysArray.forEach((key, index) => {
            keyIndexMap[key] = index + 1;
            d.push([]);  // Initialize the array for each unique key
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
            let pd = [[], []];
            let until = parseInt(new Date().getTime() / 1000)

            const fetchDataPromises = sensors.map(async (sensor) => {
                let since = parseInt((new Date().getTime() / 1000) - 60 * 60 * props.from)
                let allData = null
                for (; ;) {
                    if (since >= until) break
                    let data = await new NetworkApi().getAsync(sensor, since, until, { limit: pjson.settings.dataFetchPaginationSize });
                    if (data.result === "success") {
                        if (!allData) allData = data
                        else allData.data.measurements = allData.data.measurements.concat(data.data.measurements)

                        let returndDataLength = data.data.measurements.length
                        if (data.data.nextUp) until = data.data.nextUp
                        else if (data.data.fromCache) until = data.data.measurements[data.data.measurements.length - 1].timestamp
                        else if (returndDataLength >= pjson.settings.dataFetchPaginationSize) until = data.data.measurements[data.data.measurements.length - 1].timestamp
                        else break
                    } else {
                        allData = data
                        break
                    }
                }
                // filter out data that is not in the time range
                allData.data.measurements = allData.data.measurements.filter(x => x.timestamp >= since)
                return { sensor, data: allData };
            });

            // Use Promise.all to wait for all promises to resolve
            const results = await Promise.all(fetchDataPromises);

            //console.log(results)
            //
            const timestampIndexMap = gdata.reduce((acc, entry, index) => {
                acc[entry.t] = index;
                return acc;
            }, {});

            results.forEach(({ sensor, data }) => {
                if (data?.result === "success" && data.data.measurements.length) {
                    let d = parse(data.data);

                    // Update SensorData state
                    setSensorData((s) => [...s, d]);

                    if (pd.length < sensors.length + 2) pd.push([]);

                    for (let j = 0; j < d.measurements.length; j++) {
                        const timestamp = d.measurements[j].timestamp;

                        if (timestamp in timestampIndexMap) {
                            // Update existing entry in gdata
                            gdata[timestampIndexMap[timestamp]][d.name || d.mac] = d.measurements[j].parsed[props.dataKey];
                        } else {
                            // Add new entry to gdata
                            gdata.push({
                                t: timestamp,
                                [d.name || d.mac]: d.measurements[j].parsed[props.dataKey],
                            });

                            // Update timestampIndexMap
                            timestampIndexMap[timestamp] = gdata.length - 1;
                        }
                    }
                }
            });

            props.setData(results)
            setLoading(false);
            props.isLoading(false);
        })();
    }, [sensors, props.from, props.dataKey]);

    const { width } = useContainerDimensions(ref)
    const colorMode = useColorMode().colorMode;
    if (loading) return <Box height={450}><Progress isIndeterminate /></Box>
    console.log("gdata.length", gdata.length)
    return (
        <div ref={ref}>
            {!gdata.length ?
                <Box height={450}>
                    <center style={{ paddingTop: 240, height: 450 }} className="nodatatext">
                        {t("no_data_in_range")}
                    </center>
                </Box>
                : (
                    <UplotReact
                        options={{
                            padding: [10, 10, 0, -10],
                            width: width,
                            height: 450,
                            series: [
                                {
                                    label: t('time'),
                                    class: "graphLabel",
                                    value: "{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}",
                                },
                                ...sensorData.map((x, i) => {
                                    return {
                                        label: x.name || x.sensor,
                                        points: { show: true, size: 2, fill: getGraphColor(i) },
                                        stroke: getGraphColor(i),
                                        fill: getGraphColor(i, true),
                                    }
                                })
                            ],
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
                                            var out = useDates ? ddmm(raw) : hhmm(raw);
                                            if (prevRaw === out) {
                                                if (useDates) return hhmm(raw);
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
                        data={getGraphData()}
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

export function EmtpyGraph() {
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