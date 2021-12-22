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
import DurationText from "./DurationText";

const smallSensorValue = {
    fontFamily: "montserrat",
    fontSize: 16,
    fontWeight: 600,
}

const smallSensorValueUnit = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 14,
}

const lastUpdatedText = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 14,
    color: "rgba(27, 72, 71, 0.5)"
}

class SensorCard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: null,
            lastParsedReading: null,
            loading: true,
            graphDataKey: "temperature",
        }
    }
    componentDidMount() {
        this.loadData()
    }
    componentWillUnmount() {
        clearTimeout(this.fetchDataLoop);
    }
    async loadGraphData(graphDataMode, lastDataPoint) {
        var graphData = await new NetworkApi().getAsync(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.props.dataFrom), { mode: graphDataMode })
        if (graphData.result === "success") {
            let d = parse(graphData.data);
            if (lastDataPoint == null && d.measurements.length > 0) lastDataPoint = d.measurements[0]
            this.setState({ data: d, lastParsedReading: lastDataPoint, loading: false, table: d.table, resolvedMode: d.resolvedMode })
        } else if (graphData.result === "error") {
            console.error(graphData.error)
            this.setState({ ...this.state, loading: false })
        }
    }
    async loadData() {
        clearTimeout(this.fetchDataLoop);
        this.fetchDataLoop = setTimeout(() => {
            this.loadData()
        }, 60 * 1000);
        var graphDataMode = this.props.dataFrom <= 24 ? "mixed" : "sparse";
        try {
            if (graphDataMode === "mixed") {
                this.loadGraphData(graphDataMode)
                return
            }
            var singleData = await new NetworkApi().getAsync(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.props.dataFrom), { mode: "dense", limit: 1, sort: "desc" });
            if (singleData.result === "success") {
                let oneDenseData = parse(singleData.data);
                var lastParsedReading = oneDenseData.measurements.length === 1 ? oneDenseData.measurements[0] : null
                this.loadGraphData(graphDataMode, lastParsedReading);
            } else if (singleData.result === "error") {
                console.error(singleData.error)
                this.setState({ ...this.state, loading: false })
            }
        } catch (e) {
            console.log("err", e)
            this.setState({ data: null, loading: false })
        }

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
        if (type === "movementCounter") type = "movement";
        var alert = this.getAlert(type.toLocaleLowerCase())
        if (!alert) return false
        return alert.triggered;
    }
    render() {
        var { t } = this.props;
        return (
            <div>
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
                                    <span className="main-stat">
                                        {localeNumber(getUnitHelper("temperature").value(this.getLatestReading().temperature), getUnitHelper("temperature").decimals)}
                                    </span>
                                    <span className="main-stat-unit">
                                        {getUnitHelper("temperature").unit}
                                    </span>
                                </div>
                                <div style={{ marginLeft: -30, marginRight: -30, marginTop: -10, marginBottom: -10 }}>
                                    <Graph title="" dataKey={this.state.graphDataKey} data={this.state.data.measurements} height={200} legend={false} cardView={true} from={new Date().getTime() - 60 * 60 * 1000 * this.props.dataFrom} />
                                </div>
                                <hr style={{ margin: "0px 0 10px 0" }} />
                                <SimpleGrid columns={2} style={{ width: "100%" }}>
                                    {["humidity", "battery", "pressure", "movementCounter"].map(x => {
                                        return <GridItem key={x} style={{ color: this.isAlertTriggerd(x) ? "#f27575" : undefined }}>
                                            <span style={smallSensorValue}>{this.getLatestReading()[x] == null ? "-" : localeNumber(getUnitHelper(x).value(this.getLatestReading()[x], this.getLatestReading()["temperature"]), getUnitHelper(x).decimals)}</span>
                                            <span style={smallSensorValueUnit}> {x === "movementCounter" ? t(getUnitHelper(x).unit.toLocaleLowerCase()) : getUnitHelper(x).unit}</span>
                                        </GridItem>
                                    })}
                                </SimpleGrid>
                            </div> : <div>
                                <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", marginTop: 100 }}>{t("no_data").split("\n").map(x => <div key={x}>{x}</div>)}</center>
                            </div>}
                        </div>
                    )}
                </Box>
                <div style={{ ...lastUpdatedText, width: "100%", textAlign: "right", marginTop: 5 }}>
                    <DurationText from={this.state.lastParsedReading ? this.state.lastParsedReading.timestamp : " - "} t={this.props.t} />
                </div>
            </div>
        )
    }
}

export default withTranslation()(SensorCard);