import { Progress } from "@chakra-ui/progress";
import React, { useEffect, useRef, useState } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import pjson from '../../package.json';
import NetworkApi from "../NetworkApi";
import parse from "../decoder/parser";
import { ruuviTheme } from "../themes";
import { Box } from "@chakra-ui/react";
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

function hashString(inputString) {
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
        const charCode = inputString.charCodeAt(i);
        hash = (hash << 5) - hash + charCode;
    }
    return hash;
}

function stringToColor(inputString) {
    const hash = hashString(inputString);

    // Use HSL color model for more varied colors
    const hue = (hash % 360 + 360) % 360;
    const saturation = 50; // You can adjust these values
    const lightness = 50; // to control the color appearance

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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

            setLoading(false);
            props.isLoading(false);
        })();
    }, [sensors, props.from, props.dataKey]);

    const { width } = useContainerDimensions(ref)
    const colorMode = "dark"
    if (loading) return <Box height={450}><Progress isIndeterminate /></Box>
    if (!gdata) return <Box height={450}>{t("no_data")}</Box>
    return (
        <div ref={ref}>
            <UplotReact
                options={{
                    padding: [0,10,0,-10],
                    width: width,
                    height: 450,
                    series: [
                        {
                            label: "ts",
                            class: "graphLabel",
                            value: "{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}",
                        },
                        ...sensorData.map(x => {
                            return {
                                label: x.name || x.sensor,
                                points: { show: true, size: 2, fill: stringToColor(x.sensor) },
                                stroke: stringToColor(x.sensor),
                            }
                        })
                    ],
                    axes: [
                        {
                            font: "12px Arial",
                            stroke: ruuviTheme.graph.axisLabels[colorMode],
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


export default CompareView