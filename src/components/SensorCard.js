import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    Heading,
    Box,
    SimpleGrid,
    GridItem,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "./Graph";
import parse from "../decoder/parser";
import { Spinner } from "@chakra-ui/react"

const smallSensorValue = {
    fontFamily: "montserrat",
    fontSize: 16,
    fontWeight: 600,
}

const smallSensorValueUnit = {
    fontFamily: "montserrat",
    fontSize: 12,
}

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
            <Box maxW="sm" height="350px" borderWidth="1px" borderRadius="lg" overflow="hidden" padding="24px" style={{ backgroundColor: "white" }}>
                <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold" }}>
                    {this.props.sensor.name || this.props.sensor.sensor}
                </Heading>
                {this.state.loading ? (
                    <center>
                        <Spinner size="xl" />
                    </center>
                ) : (
                    <div>
                        {this.state.data && this.state.data.measurements.length ? <div>
                            <div>
                                <span class="main-stat">
                                    {this.getLatestReading().temperature}
                                </span>
                                <span class="main-stat-unit">
                                    °C
                                </span>
                            </div>
                            <div style={{ marginLeft: -30, marginRight: -30, marginTop: -20, marginBottom: -10 }}>
                                <Graph title="" dataKey={"temperature"} data={this.state.data.measurements} height={200} legend={false} cardView={true} />
                            </div>
                            <hr style={{ margin: "0px 0 10px 0" }} />
                            <SimpleGrid columns={{ sm: 2 }} style={{ width: "100%" }}>
                                <GridItem><span style={smallSensorValue}>{this.getLatestReading().humidity}</span> <span style={smallSensorValueUnit}>%</span></GridItem>
                                <GridItem><span style={smallSensorValue}>{this.getLatestReading().battery / 1000}</span> <span style={smallSensorValueUnit}>V</span></GridItem>
                                <GridItem><span style={smallSensorValue}>{this.getLatestReading().pressure / 100}</span> <span style={smallSensorValueUnit}>hPa</span></GridItem>
                                <GridItem><span style={smallSensorValue}>{this.getLatestReading().movementCounter}</span> <span style={smallSensorValueUnit}>motions</span></GridItem>
                            </SimpleGrid>
                        </div>:<div>
                        <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", marginTop: 100 }}>No data.<br/>The sensor need to be in range of a gateway.</center>
                            </div>}
                    </div>
                )}
            </Box>
        )
    }
}

export default SensorCard;