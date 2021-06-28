import React, { Component } from "react";
import UplotReact from 'uplot-react';
import 'uplot/dist/uPlot.min.css';
import { SizeMe } from 'react-sizeme'


class Graph extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dimensions: { width: 300, height: 300 }
        }
    }
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
                        height: 300,
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
                        cursor: { show: this.props.cursor || false, drag: { x: true, y: true, uni: 50 } },
                        scales: { x: { time: true } },
                        axes: [
                            { grid: {show: false}, },
                        ],
                    }}
                    data={this.getGraphData()}
                />
            }</SizeMe>
        )
    }
}

export default Graph;