import React, { Component } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import { SizeMe } from 'react-sizeme'
import { withTranslation } from 'react-i18next';

function ddmm(ts) {
    var d = new Date(ts * 1000);
    return d.getDate() + "/" + (d.getMonth() + 1)
}

function hhmm(ts) {
    var d = new Date(ts * 1000);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)
}

class Graph extends Component {
    getGraphData() {
        if (!this.props.data) return [[], []];
        var d = JSON.parse(JSON.stringify(this.props.data));
        d = d.reverse();
        return [d.map(x => x.timestamp),
        d.map(x => x.parsed[this.props.dataKey])]
    }
    render() {
        var useDatesOnX = false;
        if (this.props.xFrom && this.props.xTo) {
            if (this.props.xTo - this.props.xFrom > 60 * 60 * 24 * 2) useDatesOnX = true;
        } else {
            if (this.props.data && this.props.data.length) {
                var dataXSpan = this.props.data[0].timestamp - this.props.data[this.props.data.length - 1].timestamp;
                if (dataXSpan > 60 * 60 * 24 * 2) useDatesOnX = true;
            }
        }
        return (
            <SizeMe>{({ size }) =>
                <UplotReact
                    options={{
                        title: this.props.title,
                        width: size.width,
                        height: this.props.height || 300,
                        legend: {
                            show: this.props.legend === undefined ? true : this.props.legend,
                        },
                        series: [{
                            label: this.props.t('time'),
                            value: "{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}",
                        }, {
                            label: this.props.t(this.props.dataKey),
                            spanGaps: true,
                            points: { show: this.props.points || false, size: 4, fill: "green" },
                            width: 2,
                            fill: "rgba(1,174,144,0.2)",
                            stroke: "rgba(1,174,144,1)",
                        }],
                        cursor: { show: this.props.cursor || false, drag: { x: true, y: true, uni: 50 } },
                        scales: { x: { time: true } },
                        axes: [
                            {
                                grid: { show: false },
                                values: useDatesOnX ? (self, ticks) => ticks.map(rawValue => ddmm(rawValue)) : (self, ticks) => ticks.map(rawValue => hhmm(rawValue)),
                            },
                        ],
                    }}
                    data={this.getGraphData()}
                />
            }</SizeMe>
        )
    }
}

export default withTranslation()(Graph);