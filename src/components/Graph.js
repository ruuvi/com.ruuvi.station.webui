import React, { Component, Suspense, useEffect, useState } from "react";
import 'uplot/dist/uPlot.min.css';
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber, round } from "../UnitHelper";
import UplotTouchZoomPlugin from "./UplotTouchZoomPlugin";
import { ruuviTheme } from "../themes";
import { withColorMode } from "../utils/withColorMode";
import { IconButton } from "@chakra-ui/react";
import { MdInfo } from "react-icons/md";
import notify from "../utils/notify";
const UplotReact = React.lazy(() => import('uplot-react'));

function ddmm(ts) {
    var d = new Date(ts * 1000);
    return d.getDate() + "." + (d.getMonth() + 1) + "."
}

function hhmm(ts) {
    var d = new Date(ts * 1000);
    if (d.getHours() === 0 && d.getMinutes() === 0) return ddmm(ts)
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)
}

const legendHider = ({
    hooks: {
        init(u, opts) {
            document.getElementsByClassName("u-legend")[0].style.visibility = 'hidden';
            u.over.addEventListener("mouseleave", () => {
                document.getElementsByClassName("u-legend")[0].style.visibility = 'hidden';
            });
            u.over.addEventListener("mouseenter", () => {
                document.getElementsByClassName("u-legend")[0].style.visibility = '';
            });
        }
    }
});

function calculateAverage(data, zoom) {
    if (data.length === 0) {
        return 0.0;
    }

    let totalArea = 0.0;
    // Compute the area under the curve for each pair of consecutive points.
    for (let i = 1; i < data.length; i++) {
        const x1 = data[i - 1].timestamp;
        const y1 = data[i - 1].value;
        const x2 = data[i].timestamp;
        const y2 = data[i].value;

        // Calculate the area of the trapezium formed by two consecutive data points.
        const area = (x2 - x1) * (y1 + y2) / 2.0;
        totalArea += area;
    }

    // Calculate the width of the x-range.
    const timeSpan = data[data.length - 1].timestamp - data[0].timestamp;

    // If all data points have the same x-value, simply return the average of their y-values.
    if (timeSpan === 0) {
        const sumYValues = data.reduce((sum, entry) => sum + entry.value, 0);
        return sumYValues / data.length;
    }

    // Compute the average using the trapezoidal rule.
    return round(totalArea / timeSpan, 2);
}

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
    }
}

function DataInfo(props) {
    const { graphData, t } = props
    const [currZoom, setCurrZoom] = useState(null);
    useEffect(() => {
        zoomData.registerListener(v => {
            setCurrZoom(v)
        })
    }, [])

    // convert to an easier to work with format
    let data = [];
    for (let i = 0; i < graphData[1].length; i++) {
        if (graphData[1][i] === null) continue
        data.push({ timestamp: graphData[0][i], value: graphData[1][i] })
    }

    // remove data outside zoom range
    if (currZoom) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].timestamp < currZoom[0] || data[i].timestamp > currZoom[1]) {
                data.splice(i, 1)
                i--
            }
        }
    }
    let min = Math.min(...data.map(x => x.value))
    let max = Math.max(...data.map(x => x.value))
    let avg = calculateAverage(data)
    return <>
        <span className="graphLabel" style={{ marginRight: 18 }}><b>{t("graph_stat_min")}</b>: {localeNumber(min)}</span>
        <span className="graphLabel" style={{ marginRight: 18 }}><b>{t("graph_stat_max")}</b>: {localeNumber(max)}</span>
        <span className="graphLabel"><b>{t("graph_stat_avg")}</b>: {localeNumber(avg)}</span>
        <IconButton mt={"-3px"} variant="ghost" onClick={() => notify.info(t("graph_stats_info"))}>
            <MdInfo size="16" className="buttonSideIcon" />
        </IconButton>
    </>
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
        var d = JSON.parse(JSON.stringify(this.props.data));
        d = d.reverse();
        d = d.filter(x => x.parsed && x.parsed[this.props.dataKey] !== undefined)
        d.sort((a, b) => a.timestamp > b.timestamp)
        let out = [
            d.map(x => x.timestamp),
            d.map(x => getUnitHelper(this.props.dataKey).value(x.parsed[this.props.dataKey], x.parsed.temperature))
        ]
        for (let i = 1; i < out[0].length; i++) {
            if (out[0][i] - out[0][i - 1] >= 3600) {
                out[0].splice(i, 0, out[0][i - 1] + 3600)
                out[1].splice(i, 0, null)
                i++
            }
        }
        return out
    }
    setStateVar(k, v) {
        if (k === "zoom") zoomData.a = v
        let state = this.state;
        state[k] = v;
        this.setState(state);
    }
    shouldComponentUpdate(nextProps) {
        if (this.props.points !== nextProps.points) return true
        if (this.props.height !== nextProps.height) return true;
        if (nextProps.colorMode.colorMode !== this.props.colorMode.colorMode) return true;
        dataKeyChanged = this.props.dataKey !== nextProps.dataKey;
        if (this.state.zoom && !dataKeyChanged) return false;
        if (this.props.data && this.props.data.length) {
            let ts = this.props.data[0].timestamp;
            dataUpdated = ts !== lastDataPointTs || this.props.data.length !== nextProps.data.length;
            lastDataPointTs = ts;
        }
        if (this.state.zoom && this.props.data.length && nextProps.data.length && this.props.data[0].timestamp !== nextProps.data[0].timestamp) console.log("Should NOT")
        if (this.state.zoom && this.props.data.length && nextProps.data.length && this.props.data[0].timestamp !== nextProps.data[0].timestamp) return false
        return dataKeyChanged || this.props.data.length !== nextProps.data.length || dataUpdated
    }
    getXRange() {
        return [this.props.from / 1000, new Date().getTime() / 1000]
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
        window.addEventListener('resize', this.resize)
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.resize)
    }
    render() {
        let alert = this.props.alert
        let width = this.pRef?.current?.offsetWidth
        setTimeout(() => {
            if (!width) {
                this.forceUpdate()
            }
        }, 100)
        var plugins = [];
        if (!this.props.cardView) {
            plugins.push(UplotTouchZoomPlugin(this.getXRange()))
            plugins.push(legendHider)
        }
        let colorMode = this.props.colorMode.colorMode;
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

        let dataMin = Math.min(...graphData[1].map(x => x))
        if (isNaN(dataMin)) dataMin = -70000;
        dataMin -= 10;
        let fillGrad = [
            [dataMin, ruuviTheme.graph.alert.fill[colorMode]],
            [alertMin, ruuviTheme.graph.fill[colorMode]],
            [alertMax, ruuviTheme.graph.alert.fill[colorMode]],
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
                fill: ruuviTheme.graph.fill[colorMode],
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
                            <div style={{ height: height }}>
                                <UplotReact
                                    options={{
                                        title: this.props.title,
                                        width: width,
                                        height: height,
                                        plugins: plugins,
                                        legend: {
                                            show: this.props.legend === undefined ? true : this.props.legend,
                                        },
                                        series: [{
                                            label: this.props.t('time'),
                                            class: "graphLabel",
                                            value: "{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}",
                                        }, {
                                            label: this.props.dataName || this.props.t(this.props.dataKey),
                                            class: "graphLabel",
                                            spanGaps: false,
                                            points: { show: this.props.points, size: 4, fill: ruuviTheme.graph.fill[colorMode] },
                                            width: 1,
                                            ...alertColor(),
                                            value: (self, rawValue) => localeNumber(rawValue)
                                        }],
                                        hooks: {
                                            drawSeries: [
                                                (u, si) => {
                                                    if (!alert || !alert.enabled) return
                                                    let ctx = u.ctx;
                                                    ctx.save();
                                                    let s = u.series[si];
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

                                                    const offset = (s.width % 2) / 2;

                                                    ctx.translate(offset, offset);

                                                    ctx.beginPath();
                                                    ctx.strokeStyle = ruuviTheme.graph.alert.stroke[colorMode];
                                                    let yAxisVals = u.data[1]
                                                    let graphYMax = Math.max(...yAxisVals) + 0.5
                                                    let graphYMin = Math.min(...yAxisVals) - 0.5
                                                    if (alertMax < graphYMax) lineAt(alertMax)
                                                    if (alertMin > graphYMin) lineAt(alertMin)
                                                    ctx.stroke();
                                                    ctx.translate(-offset, -offset);

                                                    ctx.restore();
                                                }
                                            ],
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
                                                ticks: {
                                                    size: 0
                                                },
                                                font: "12px Arial",
                                                values: (_, ticks) => ticks.map(rawValue => localeNumber(rawValue)),
                                            }
                                        ],
                                    }}
                                    data={graphData}
                                />
                            </div>
                            {!this.props.cardView && <>
                                <center style={{ fontFamily: "Arial", fontSize: "14px", marginTop: 35 }}>
                                    <DataInfo graphData={graphData} t={this.props.t} zoom={this.state.zoom} />
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