import React, { Component } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import { SizeMe } from 'react-sizeme'


function mmdd(ts) {
    var d = new Date(ts*1000);
    return (d.getMonth() + 1) + "/" + d.getDate()
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
                            label: '',
                            value: "{YYYY}-{MM}-{DD} {HH}:{mm}:{ss}",
                        }, {
                            label: this.props.dataKey,
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
                                values: this.props.cardView ? (self, ticks) => ticks.map(rawValue => mmdd(rawValue)) : undefined,
                            },
                        ],
                    }}
                    data={this.getGraphData()}
                />
            }</SizeMe>
        )
    }
}

export default Graph;