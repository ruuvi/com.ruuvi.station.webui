import React, { Component } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import { SizeMe } from 'react-sizeme'
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";
import UplotTouchZoomPlugin from "./UplotTouchZoomPlugin";
import { ruuviTheme } from "../themes";

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


var lastDataPoints = -1;
var zoomHasChanged = false;
class Graph extends Component {
    getGraphData() {
        if (!this.props.data) return [[], []];
        var d = JSON.parse(JSON.stringify(this.props.data));
        d = d.reverse();
        return [d.map(x => x.timestamp),
        d.map(x => getUnitHelper(this.props.dataKey).value(x.parsed[this.props.dataKey], x.parsed.temperature))]
    }
    getXRange() {
        return [this.props.from / 1000, new Date().getTime() / 1000]
    }
    render() {
        var plugins = [];
        if (!this.props.cardView) {
            plugins.push(UplotTouchZoomPlugin(this.getXRange()))
            plugins.push(legendHider)
        }
        return (
            <SizeMe>{({ size }) =>
                <UplotReact
                    options={{
                        title: this.props.title,
                        width: size.width,
                        height: this.props.height || 300,
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
                            fill: ruuviTheme.colors.primaryLight,
                            stroke: ruuviTheme.colors.primary,
                        }],
                        cursor: { show: this.props.cursor || false, drag: { x: true, y: true, uni: 50 } },
                        scales: {
                            x: {
                                time: true, auto: this.props.from === undefined, range: (_, fromMin, fromMax) => {
                                    let dataHasChanged = lastDataPoints !== this.props.data.length;
                                    lastDataPoints = this.props.data.length;
                                    if ((dataHasChanged && !zoomHasChanged) || this.props.data.length === 1 || (this.props.data.length && fromMax === this.props.data[0].timestamp && fromMin === this.props.data[this.props.data.length - 1].timestamp)) {
                                        let range = this.getXRange();
                                        fromMin = range[0]
                                        fromMax = range[1]
                                        zoomHasChanged = false
                                    } else {
                                        zoomHasChanged = true
                                    }
                                    return [fromMin, fromMax]
                                }
                            }
                        },
                        axes: [
                            {
                                grid: { show: false },
                                font: "12px Arial",
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
                                grid: { stroke: ruuviTheme.colors.graphGrid, width: 2 },
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
            }</SizeMe>
        )
    }
}

export default withTranslation()(Graph);