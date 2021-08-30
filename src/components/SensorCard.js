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
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";

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
            graphDataKey: "temperature",
        }
        this.loadData(true)
    }
    loadData() {
        new NetworkApi().get(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.state.from), { mode: "dense", limit: 1, sort: "desc" }, resp => {
            if (resp.result === "success") {
                let d = parse(resp.data);
                this.setState({ lastParsedReading: d.measurements.length === 1 ? d.measurements[0] : null })
                new NetworkApi().get(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.state.from), { mode: "sparse" }, resp => {
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
            } else if (resp.result === "error") {
                alert(resp.error)
                this.setState({ ...this.state, loading: false })
            }
        }, (e) => {
            //alert("LoadData error: " + e.toString())
            console.log("err", e)
            this.setState({ data: null, loading: false })
        })

    }
    getLatestReading() {
        if (!this.state.lastParsedReading) return [];
        return this.state.lastParsedReading.parsed;
    }
    getTimeSinceLastUpdate() {
        if (!this.state.data || !this.state.data.measurements.length) return " - ";
        var now = new Date().getTime() / 1000
        var lastUpdate = this.state.data.measurements[0].timestamp
        return Math.floor(((now - lastUpdate) / 60))
    }
    getAlert(type) {
        if (!this.props.alerts) return null
        var idx = this.props.alerts.alerts.findIndex(x => x.type === type)
        if (idx !== -1) {
            return this.props.alerts.alerts[idx]
        }
        return null
    }
    isAlertTriggerd(type) {
        var alert = this.getAlert(type.toLocaleLowerCase())
        if (!alert) return false
        return alert.triggered;
    }
    render() {
        var { t } = this.props;
        return (
            <Box height="360px" borderRadius="lg" overflow="hidden" padding="24px" style={{ backgroundColor: "white" }}>
                <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold" }}>
                    {this.props.sensor.name}
                </Heading>
                {this.state.loading ? (
                    <center>
                        <Spinner size="xl" />
                    </center>
                ) : (
                    <div>
                        {this.state.data && this.state.data.measurements.length ? <div>
                            <div style={{ color: this.isAlertTriggerd("temperature") ? "#f27575" : undefined }}>
                                <span class="main-stat">
                                    {localeNumber(getUnitHelper("temperature").value(this.getLatestReading().temperature), getUnitHelper("temperature").decimals)}
                                </span>
                                <span class="main-stat-unit">
                                    {getUnitHelper("temperature").unit}
                                </span>
                            </div>
                            <div style={{ marginLeft: -30, marginRight: -30, marginTop: -10, marginBottom: -10 }}>
                                <Graph title="" dataKey={this.state.graphDataKey} data={this.state.data.measurements} height={200} legend={false} cardView={true} from={new Date().getTime() - 60 * 60 * 1000 * this.state.from} />
                            </div>
                            <hr style={{ margin: "0px 0 10px 0" }} />
                            <SimpleGrid columns={2} style={{ width: "100%" }}>
                                {["humidity", "battery", "pressure", "movementCounter"].map(x => {
                                    return <GridItem style={{ color: this.isAlertTriggerd(x) ? "#f27575" : undefined }}>
                                        <span style={smallSensorValue}>{localeNumber(getUnitHelper(x).value(this.getLatestReading()[x]), getUnitHelper(x).decimals)}</span>
                                        <span style={smallSensorValueUnit}> {x === "movementCounter" ? t(getUnitHelper(x).unit.toLocaleLowerCase()) : getUnitHelper(x).unit}</span>
                                    </GridItem>
                                })}
                            </SimpleGrid>
                        </div> : <div>
                            <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", marginTop: 100 }}>No data.<br />The sensor need to be in range of a gateway.</center>
                        </div>}
                    </div>
                )}
            </Box>
        )
    }
}

export default withTranslation()(SensorCard);