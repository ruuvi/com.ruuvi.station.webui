import React, { Component, Suspense, useEffect, useState, useMemo } from "react";
import 'uplot/dist/uPlot.min.css';
import { withTranslation } from 'react-i18next';
import { getDisplayValue, getUnitHelper, localeNumber, round } from "../UnitHelper";
import UplotTouchZoomPlugin from "./uplotPlugins/UplotTouchZoomPlugin";
import UplotLegendHider from "./uplotPlugins/UplotLegendHider";
import { ruuviTheme } from "../themes";
import { withColorMode } from "../utils/withColorMode";
import { IconButton } from "@chakra-ui/react";
import { MdInfo } from "react-icons/md";
import notify from "../utils/notify";
import { date2digits, secondsToUserDateString, time2digits } from "../TimeHelper";
import Store from "../Store";
const UplotReact = React.lazy(() => import('uplot-react'));

let zoomData = {
    value: undefined,
    aListener: function (val) { },
    set a(val) {
        this.value = val;
        this.aListener(val);
    },
    get a() {
        return this.value;
    },
    registerListener: function (listener) {
        this.aListener = listener;
    },
    unregisterListener: function (listener) {
        this.aListener = function (val) { };
    }
}

function DataInfo(props) {
    const { graphData, t, type } = props;
    const [currZoom, setCurrZoom] = useState(null);

    const uh = getUnitHelper(type);

    useEffect(() => {
        const listener = zoomData.registerListener(v => {
            setCurrZoom(v);
        });
        return () => {
            zoomData.unregisterListener(listener);
        };
    }, []);

    const filteredData = useMemo(() => {
        return graphData[0].reduce((acc, timestamp, i) => {
            const value = graphData[1][i];
            if (value !== null && (!currZoom || (timestamp >= currZoom[0] && timestamp <= currZoom[1]))) {
                acc.push({ timestamp, value });
            }
            return acc;
        }, []);
    }, [graphData, currZoom]);

    const { min, max, avg } = useMemo(() => {
        if (filteredData.length === 0) {
            return { min: null, max: null, avg: null };
        }
        const { min, max, sum } = filteredData.reduce((acc, { value }) => {
            acc.min = Math.min(acc.min, value);
            acc.max = Math.max(acc.max, value);
            acc.sum += value;
            return acc;
        }, { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, sum: 0 });

        let decimalPlaces = uh.decimals;
        let avg = sum / filteredData.length;
        avg = Math.round(avg * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);

        return { min, max, avg };
    }, [filteredData]);

    return (
        <>
            <span className="graphLabel" style={{ marginRight: 18 }}>
                <b>{t("graph_stat_min")}</b>: {getDisplayValue(type, min)}
            </span>
            <span className="graphLabel" style={{ marginRight: 18 }}>
                <b>{t("graph_stat_max")}</b>: {getDisplayValue(type, max)}
            </span>
            <span className="graphLabel">
                <b>{t("graph_stat_avg")}</b>: {getDisplayValue(type, avg)}
            </span>
            <IconButton mt={"-3px"} variant="ghost" onClick={() => notify.info(t("graph_stats_info"))}>
                <MdInfo size="16" className="buttonSideIcon" />
            </IconButton>
        </>
    );
}


let screenW = window.innerWidth
var lastDataPointTs = -1;
var dataUpdated = false;
let dataKeyChanged = false;
let xRangeUpdateThottle = 0;
class Graph extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: [],
            zoom: undefined,
            resizing: false,
        }
        this.pRef = React.createRef();
        this.resize.bind(this)
        this.resizeTimeout = undefined;
    }
    getGraphData() {
        if (!this.props.data) return [[], []];

        const dataKey = this.props.dataKey;
        const unitHelper = getUnitHelper(dataKey);

        // Filter and sort the data
        const filteredData = [];
        for (let i = 0; i < this.props.data.length; i++) {
            const x = this.props.data[i];
            if (x.parsed && x.parsed[dataKey] !== undefined) {
                filteredData.push(x);
            }
        }

        filteredData.sort((a, b) => a.timestamp - b.timestamp);

        // Process the sorted data
        const timestamps = [];
        const values = [];
        for (let i = 0; i < filteredData.length; i++) {
            const x = filteredData[i];
            timestamps.push(x.timestamp);
            values.push(unitHelper.value(x.parsed[dataKey], dataKey === "humidity" ? x.parsed.temperature : undefined));
        }

        // Insert null values for time gaps
        for (let i = 1; i < timestamps.length; i++) {
            const timeDifference = timestamps[i] - timestamps[i - 1];
            if (timeDifference >= 3600) {
                const insertTime = timestamps[i - 1] + 3600;
                timestamps.splice(i, 0, insertTime);
                values.splice(i, 0, null);
            }
        }

        return [timestamps, values];
    }
    setStateVar(k, v) {
        if (k === "zoom") zoomData.a = v
        let state = this.state;
        state[k] = v;
        this.setState(state);
    }
    shouldComponentUpdate(nextProps) {
        if (this.props.unit !== nextProps.unit) return true;
        if (this.props.height !== nextProps.height) return true;
        if (nextProps.colorMode.colorMode !== this.props.colorMode.colorMode) return true;
        if (nextProps.overrideColorMode !== this.props.overrideColorMode) return true;
        dataKeyChanged = this.props.dataKey !== nextProps.dataKey;
        if (this.state.zoom && !dataKeyChanged) return false;
        if (this.props.data && this.props.data.length) {
            let ts = this.props.data[0].timestamp;
            dataUpdated = ts !== lastDataPointTs || this.props.data.length !== nextProps.data.length;
            lastDataPointTs = ts;
        }
        if (this.state.zoom && this.props.data.length && nextProps.data.length && this.props.data[0].timestamp !== nextProps.data[0].timestamp) return false
        return dataKeyChanged || this.props.data.length !== nextProps.data.length || dataUpdated
    }
    getXRange() {
        return [this.props.from / 1000, this.props.to ? this.props.to / 1000 : new Date().getTime() / 1000]
    }
    resize = (e) => {
        if (window.innerWidth === screenW) return;
        //if (!this.props.showLoadingOnResize) return this.forceUpdate()
        if (!this.resizeTimeout) {
            this.setState({ ...this.state, resizing: true })
            this.forceUpdate()
        }
        clearTimeout(this.resizeTimeout)
        this.resizeTimeout = setTimeout(() => {
            this.lastResize = new Date().getTime();
            this.resizeTimeout = undefined;
            this.setState({ ...this.state, resizing: false })
            this.forceUpdate()
        }, 100)
    }
    componentDidMount() {
        if (this.props.setRef) this.props.setRef(this.pRef)
        window.addEventListener('resize', this.resize)
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.resize)
    }
    render() {
        let showDots = new Store().getGraphDrawDots()
        let alert = this.props.alert
        let width = this.props.width || this.pRef?.current?.offsetWidth
        setTimeout(() => {
            if (!width) {
                this.forceUpdate()
            }
        }, 100)
        var plugins = [];
        if (!this.props.cardView) {
            plugins.push(UplotTouchZoomPlugin(this.getXRange()))
            plugins.push(UplotLegendHider())
        }
        let colorMode = this.props.overrideColorMode ? this.props.overrideColorMode : this.props.colorMode.colorMode;
        let height = this.props.height || 300;
        let graphData = this.getGraphData()

        function scaleGradient(u, scaleKey, ori, scaleStops, discrete = false) {
            try {
                let scale = u.scales[scaleKey];

                let minStopIdx;
                let maxStopIdx;

                for (let i = 0; i < scaleStops.length; i++) {
                    let stopVal = scaleStops[i][0];

                    if (stopVal <= scale.min || minStopIdx === null)
                        minStopIdx = i;

                    maxStopIdx = i;

                    if (stopVal >= scale.max)
                        break;
                }

                if (minStopIdx === maxStopIdx)
                    return scaleStops[minStopIdx][1];

                let minStopVal = scaleStops[minStopIdx][0];
                let maxStopVal = scaleStops[maxStopIdx][0];

                if (minStopVal === -Infinity)
                    minStopVal = scale.min;

                if (maxStopVal === Infinity)
                    maxStopVal = scale.max;

                let minStopPos = u.valToPos(minStopVal, scaleKey, true);
                let maxStopPos = u.valToPos(maxStopVal, scaleKey, true);

                let range = minStopPos - maxStopPos;

                let x0, y0, x1, y1;

                if (ori === 1) {
                    x0 = x1 = 0;
                    y0 = minStopPos;
                    y1 = maxStopPos;
                }
                else {
                    y0 = y1 = 0;
                    x0 = minStopPos;
                    x1 = maxStopPos;
                }

                let grd = u.ctx.createLinearGradient(x0, y0, x1, y1);

                let prevColor;

                for (let i = minStopIdx; i <= maxStopIdx; i++) {
                    let s = scaleStops[i];
                    let stopPos = i === minStopIdx ? minStopPos : i === maxStopIdx ? maxStopPos : u.valToPos(s[0], scaleKey, true);
                    let pct = (minStopPos - stopPos) / range;
                    if (discrete && i > minStopIdx)
                        grd.addColorStop(pct, prevColor);
                    grd.addColorStop(pct, prevColor = s[1]);
                }

                return grd;
            } catch {
                return null
            }
        }

        let alertMin = alert?.min
        let alertMax = alert?.max
        try {
            var uh = getUnitHelper(alert?.type)
            if (alert?.type === "humidity" && uh.unit !== "%") {
                alertMin = -70000
                alertMax = 70000
            } else {
                alertMin = uh.value(alertMin)
                alertMax = uh.value(alertMax)
            }
        } catch { }

        let dataMin = Number.POSITIVE_INFINITY;

        for (let i = 0; i < graphData[1].length; i++) {
            if (graphData[1][i] < dataMin) {
                dataMin = graphData[1][i];
            }
        }
        let colorFillVar = this.props.cardView ? "fillCard" : "fill"

        if (isNaN(dataMin)) dataMin = -70000;
        dataMin -= 10;
        let fillGrad = [
            [dataMin, ruuviTheme.graph.alert[colorFillVar][colorMode]],
            [alertMin, ruuviTheme.graph[colorFillVar][colorMode]],
            [alertMax, ruuviTheme.graph.alert[colorFillVar][colorMode]],
        ];
        let strokeGrad = [
            [dataMin, ruuviTheme.graph.alert.stroke[colorMode]],
            [alertMin, ruuviTheme.graph.stroke[colorMode]],
            [alertMax, ruuviTheme.graph.alert.stroke[colorMode]],
        ];

        const alertColor = () => {
            if (alert && alert.enabled) {
                return {
                    fill: (u, seriesIdx) => {
                        return scaleGradient(u, 'y', 1, fillGrad, true);
                    },
                    stroke: (u, seriesIdx) => {
                        return scaleGradient(u, 'y', 1, strokeGrad, true);
                    }
                }
            }
            return {
                fill: ruuviTheme.graph[colorFillVar][colorMode],
                stroke: ruuviTheme.graph.stroke[colorMode]
            }
        }

        return (
            <div ref={this.pRef}>
                {this.state.resizing ? (
                    <center style={{ width: "100%", height: height, paddingTop: height / 4 }}>
                        <span className='spinner'></span>
                    </center>
                ) : (
                    <Suspense fallback={
                        <center style={{ width: "100%", height: height, paddingTop: height / 4 }}>
                            <span className='spinner'></span>
                        </center>
                    }>
                        <>
                            <div style={{ height: height }} id="singleSerieGraph">
                                <UplotReact
                                    options={{
                                        title: this.props.title,
                                        width: width,
                                        drawOrder: ["series", "axes"],
                                        height: height,
                                        plugins: plugins,
                                        legend: {
                                            show: this.props.legend === undefined ? true : this.props.legend,
                                        },
                                        series: [{
                                            label: this.props.t('time'),
                                            class: "graphLabel",
                                            value: (_, ts) => secondsToUserDateString(ts),
                                        }, {
                                            label: this.props.dataName || this.props.t(this.props.dataKey),
                                            class: "graphLabel",
                                            spanGaps: false,
                                            points: { show: showDots, size: 3, fill: ruuviTheme.graph.stroke[colorMode] },
                                            width: 1,
                                            ...alertColor(),
                                            value: (self, rawValue) => localeNumber(rawValue)
                                        }],
                                        hooks: {
                                            drawSeries: [
                                                (u, si) => {
                                                    let ctx = u.ctx;
                                                    let s = u.series[si];
                                                    const offset = (s.width % 2) / 2;

                                                    ctx.save();
                                                    let xd = u.data[0];
                                                    let yd = u.data[1]

                                                    // ----- dashed line for data gaps/

                                                    ctx.beginPath();
                                                    ctx.setLineDash([2, 4]); // Dashed line pattern
                                                    ctx.strokeStyle = ruuviTheme.graph.stroke[colorMode];
                                                    ctx.lineWidth = s.width;

                                                    let lastValidIdx = -1;

                                                    for (let i = 0; i < xd.length; i++) {
                                                        if (yd[i] !== null) {
                                                            if (lastValidIdx >= 0 && i - lastValidIdx > 1) {
                                                                const x1 = u.valToPos(xd[lastValidIdx], 'x', true);
                                                                const y1 = u.valToPos(yd[lastValidIdx], 'y', true);
                                                                const x2 = u.valToPos(xd[i], 'x', true);
                                                                const y2 = u.valToPos(yd[i], 'y', true);
                                                               
                                                                let pointsVisibleInX =
                                                                    u.scales.x.min <= xd[i] && u.scales.x.max >= xd[i] &&
                                                                    u.scales.x.min <= xd[lastValidIdx] && u.scales.x.max >= xd[lastValidIdx];

                                                                let pointsVisibleInY =
                                                                    (u.scales.y.min <= yd[i] && yd[i] <= u.scales.y.max) &&
                                                                    (u.scales.y.min <= yd[lastValidIdx] && yd[lastValidIdx] <= u.scales.y.max);
                                                                    
                                                                if (pointsVisibleInX && pointsVisibleInY) {
                                                                    ctx.moveTo(x1, y1);
                                                                    ctx.lineTo(x2, y2);
                                                                }

                                                            }
                                                            lastValidIdx = i;
                                                        }
                                                    }

                                                    ctx.stroke();
                                                    ctx.setLineDash([]); // Reset to solid line

                                                    // -----

                                                    const timeToClosestDatapoint = (idx) => {
                                                        let closestToLeft = Number.POSITIVE_INFINITY
                                                        let closestToRight = Number.POSITIVE_INFINITY
                                                        if (idx !== 0) {
                                                            for (let i = idx - 1; i >= 0; i--) {
                                                                if (yd[i] !== null) {
                                                                    closestToLeft = Math.abs(xd[i] - xd[idx])
                                                                    break
                                                                }
                                                            }
                                                        }
                                                        if (idx !== yd.length - 1) {
                                                            for (let i = idx + 1; i < yd.length; i++) {
                                                                if (yd[i] !== null) {
                                                                    closestToRight = Math.abs(xd[i] - xd[idx])
                                                                    break
                                                                }
                                                            }
                                                        }
                                                        if (closestToLeft < closestToRight) return closestToLeft
                                                        return closestToRight
                                                    }

                                                    for (let i = 0; i < xd.length; i++) {
                                                        if (yd[i] === null) continue;
                                                        if (timeToClosestDatapoint(i) < 3600) continue;
                                                        let x = u.valToPos(xd[i], 'x', true);
                                                        let y = u.valToPos(yd[i], 'y', true);

                                                        if (u.scales.x.min > xd[i] || u.scales.x.max < xd[i]) continue;
                                                        let datapointIsInGraph = true;
                                                        if (u.scales.y.min > yd[i]) {
                                                            datapointIsInGraph = false;
                                                            y = u.valToPos(u.scales.y.min, 'y', true);
                                                        }
                                                        if (u.scales.y.max < yd[i]) {
                                                            datapointIsInGraph = false;
                                                            y = u.valToPos(u.scales.y.max, 'y', true);
                                                        }


                                                        if (!showDots && datapointIsInGraph) {
                                                            ctx.beginPath();
                                                            ctx.arc(x, y, 0.5, 0, 2 * Math.PI);
                                                            ctx.stroke();
                                                        }

                                                        ctx.beginPath();

                                                        const devicePixelRatio = window.devicePixelRatio || 1;
                                                        const areaWidth = Math.min(Math.max(1 * devicePixelRatio, 1), 3);

                                                        let areaToValue = u.valToPos(0, 'y', true);
                                                        if (u.scales.y.min > 0) areaToValue = u.valToPos(u.scales.y.min, 'y', true);
                                                        if (u.scales.y.max < 0) areaToValue = u.valToPos(u.scales.y.max, 'y', true);

                                                        // Create a small area that extends from the point to the zero line
                                                        ctx.moveTo(x - areaWidth, y);
                                                        ctx.lineTo(x - areaWidth, areaToValue);
                                                        ctx.lineTo(x + areaWidth, areaToValue);
                                                        ctx.lineTo(x + areaWidth, y);
                                                        ctx.closePath();

                                                        ctx.fillStyle = ruuviTheme.graph[colorFillVar][colorMode];
                                                        ctx.fill();
                                                    }
                                                    ctx.restore();

                                                    if (alert && alert.enabled) {
                                                        ctx.save();
                                                        ctx.translate(offset, offset);
                                                        ctx.beginPath();
                                                        let xd = u.data[0];
                                                        let [i0, i1] = s.idxs;
                                                        const lineAt = (val) => {
                                                            let x0 = u.valToPos(xd[i0], 'x', true);
                                                            let y0 = u.valToPos(val, 'y', true);
                                                            let x1 = u.valToPos(xd[i1], 'x', true);
                                                            let y1 = u.valToPos(val, 'y', true);
                                                            ctx.moveTo(x0, y0);
                                                            ctx.lineTo(x1, y1);
                                                        }

                                                        ctx.strokeStyle = ruuviTheme.graph.alert.stroke[colorMode];

                                                        if (alertMax <= u.scales.y.max && alertMax >= u.scales.y.min) {
                                                            lineAt(alertMax);
                                                        }

                                                        if (alertMin >= u.scales.y.min && alertMin <= u.scales.y.max) {
                                                            lineAt(alertMin);
                                                        }

                                                        ctx.stroke();
                                                        ctx.translate(-offset, -offset);

                                                        ctx.restore();
                                                    }
                                                }]
                                        },
                                        cursor: {
                                            show: this.props.cursor || false,
                                            drag: { x: true, y: true, uni: 50 },
                                            points: {
                                                size: 9,
                                                fill: ruuviTheme.graph.stroke[colorMode],
                                            },
                                        },
                                        scales: {
                                            x: {
                                                time: true, range: (_, fromX, toX) => {
                                                    // redo this at some point, this will do as a workaround for now.
                                                    let allowZoom = true;
                                                    if (xRangeUpdateThottle + 20 > new Date().getTime()) {
                                                        //console.log("throttle x-range updates")
                                                        allowZoom = false;
                                                    }
                                                    xRangeUpdateThottle = new Date().getTime();
                                                    let zoom = this.state.zoom;;
                                                    if (allowZoom) {
                                                        if (zoom && (dataKeyChanged || dataUpdated)) {
                                                            // keep zoom range
                                                            //console.log("keep zoom")
                                                            dataKeyChanged = false
                                                            dataUpdated = false;
                                                            return zoom
                                                        }
                                                        if (Number.isInteger(fromX) && Number.isInteger(toX) && !dataKeyChanged) {
                                                            // reset zoom
                                                            //console.log("reset zoom")
                                                            this.setStateVar("zoom", undefined)
                                                            zoom = undefined;
                                                        } else if (!dataUpdated && !dataKeyChanged) {
                                                            // set zoom
                                                            //console.log("set zoom")
                                                            this.setStateVar("zoom", [fromX, toX])
                                                            zoom = [fromX, toX]
                                                        }
                                                    }
                                                    dataKeyChanged = false
                                                    if (this.props.from && !zoom) {
                                                        //console.log("update x range")
                                                        dataUpdated = false;
                                                        return this.getXRange()
                                                    }
                                                    return [fromX, toX]
                                                }
                                            },
                                            y: {
                                                range: (_, fromY, toY) => {
                                                    fromY -= 0.5
                                                    toY += 0.5
                                                    return [fromY, toY]
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
                                                ticks: {
                                                    size: 0
                                                },
                                                font: "12px Arial",
                                                values: (_, ticks) => ticks.map(rawValue => localeNumber(rawValue)),
                                            }
                                        ]
                                    }}
                                    data={graphData}
                                />
                            </div>
                            {!this.props.cardView && <>
                                <center style={{ fontFamily: "Arial", fontSize: "14px", marginTop: 35 }}>
                                    <DataInfo graphData={graphData} t={this.props.t} zoom={this.state.zoom} type={this.props.dataKey} />
                                </center>
                            </>}
                        </>
                    </Suspense>
                )}
            </div>
        )
    }
}

export default withTranslation()(withColorMode(Graph));