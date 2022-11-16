import React, { Component, Suspense } from "react";
import 'uplot/dist/uPlot.min.css';
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";
import UplotTouchZoomPlugin from "./UplotTouchZoomPlugin";
import { ruuviTheme } from "../themes";
import { withColorMode } from "../utils/withColorMode";
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
        d = d.filter(x => x.parsed[this.props.dataKey] !== undefined)
        d.sort((a,b) => a.timestamp > b.timestamp)
        return [
            d.map(x => x.timestamp),
            d.map(x => getUnitHelper(this.props.dataKey).value(x.parsed[this.props.dataKey], x.parsed.temperature))
        ]
    }
    setStateVar(k, v) {
        let state = this.state;
        state[k] = v;
        this.setState(state);
    }
    shouldComponentUpdate(nextProps) {
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
        return dataKeyChanged || this.props.data.length !== nextProps.data.length
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
        return (
            <div ref={this.pRef} style={{ height: height + (this.props.cardView ? 0 : 25) }}>
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
                                    value: "{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}",
                                }, {
                                    label: this.props.dataName || this.props.t(this.props.dataKey),
                                    spanGaps: true,
                                    points: { show: this.props.points || false, size: 4, fill: "green" },
                                    width: 2,
                                    fill: ruuviTheme.graph.fill[colorMode],
                                    stroke: ruuviTheme.graph.stroke[colorMode],
                                    value: (self, rawValue) => localeNumber(rawValue)
                                }],
                                cursor: { show: this.props.cursor || false, drag: { x: true, y: true, uni: 50 } },
                                scales: {
                                    x: {
                                        time: true, auto: this.props.from === undefined, range: (_, fromX, toX) => {
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
                            data={this.getGraphData()}
                        />
                    </Suspense>
                )}
            </div>
        )
    }
}

export default withTranslation()(withColorMode(Graph));