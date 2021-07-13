import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    Stat,
    StatNumber,
    StatGroup,
    Heading,
    Box,
    SimpleGrid,
    GridItem,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "./Graph";
import parse from "../decoder/parser";
import { Spinner } from "@chakra-ui/react"

class SensorCard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: null,
            lastParsedReading: null,
            loading: true,
            from: 24 * 3,
        }
        this.loadData(true)
    }
    loadData() {
        new NetworkApi().get(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.state.from), "sparse", resp => {
            console.log("resp", resp)
            if (resp.result === "success") {
                let d = parse(resp.data);
                this.setState({ data: d, loading: false, table: d.table, resolvedMode: d.resolvedMode })
            } else if (resp.result === "error") {
                alert(resp.error)
                this.setState({ ...this.state, loading: false })
            }
        }, (e) => {
            alert("LoadData error: " + e.toString())
            console.log("err", e)
            this.setState({ data: null, loading: false })
        })
    }
    getLatestReading() {
        if (!this.state.data || !this.state.data.measurements.length) return [];
        var ms = this.state.data.measurements;
        if (!ms || !ms.length) return [];
        return ms[0].parsed;
    }

    getTimeSinceLastUpdate() {
        if (!this.state.data || !this.state.data.measurements.length) return " - ";
        var now = new Date().getTime() / 1000
        var lastUpdate = this.state.data.measurements[0].timestamp
        return Math.floor(((now - lastUpdate) / 60))
    }
    render() {
        return (
            <Box maxW="sm" height="360px" borderWidth="1px" borderRadius="lg" overflow="hidden" padding="24px" style={{ backgroundColor: "white" }}>
                <Heading size="xs">
                    {this.props.sensor.name || this.props.sensor.sensor}
                </Heading>
                {this.state.loading ? (
                    <center>
                        <Spinner size="xl" />
                    </center>
                ) : (
                    <div>
                        {this.state.data && <div>
                            <Heading size="lg">
                                {this.getLatestReading().temperature} °C
                            </Heading>
                            <Graph title="" dataKey={"temperature"} data={this.state.data.measurements} height={200} legend={false} />
                            <hr style={{margin: "10px 0 10px 0"}} />
                            <SimpleGrid columns={{ sm: 2 }}>
                                <GridItem>{this.getLatestReading().humidity}%</GridItem>
                                <GridItem>{this.getLatestReading().battery / 1000}V</GridItem>
                                <GridItem>{this.getLatestReading().pressure / 100}hPa</GridItem>
                                <GridItem>{this.getLatestReading().movementCounter} motions</GridItem>
                            </SimpleGrid>
                        </div>}
                    </div>
                )}
            </Box>
        )
    }
}

export default SensorCard;