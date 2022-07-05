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
import BigValue from "./BigValue";
import sensorboxbg from '../img/sensor-box-bg.png'
import { withColorMode } from "../utils/withColorMode";

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
}

class SensorCard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: null,
            lastParsedReading: null,
            loading: true,
            loadingHistory: true,
            graphDataKey: "temperature",
        }
    }
    componentDidMount() {
        this.loadData()
    }
    componentWillUnmount() {
        clearTimeout(this.fetchDataLoop);
    }
    async loadGraphData(graphDataMode) {
        var graphData = await new NetworkApi().getAsync(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.props.dataFrom), null, { mode: graphDataMode })
        if (graphData.result === "success") {
            let d = parse(graphData.data);
            this.setState({ data: d, loading: false, loadingHistory: false, table: d.table, resolvedMode: d.resolvedMode })
        } else if (graphData.result === "error") {
            console.error(graphData.error)
            this.setState({ ...this.state, loading: false, loadingHistory: false })
        }
    }
    async loadData() {
        clearTimeout(this.fetchDataLoop);
        this.fetchDataLoop = setTimeout(() => {
            this.loadData()
        }, 60 * 1000);
        var graphDataMode = this.props.dataFrom <= 24 ? "mixed" : "sparse";
        try {
            let singleData = await new NetworkApi().getLastestDataAsync(this.props.sensor.sensor)
            if (singleData.result === "success") {
                let oneDenseData = singleData.data;
                var lastParsedReading = oneDenseData.measurements.length === 1 ? oneDenseData.measurements[0] : null
                this.setState({ ...this.state, loading: false, lastParsedReading: lastParsedReading })
                this.loadGraphData(graphDataMode, lastParsedReading);
            } else if (singleData.result === "error") {
                console.error(singleData.error)
                this.setState({ ...this.state, loading: false, loadingHistory: false })
            }
        } catch (e) {
            console.log("err", e)
            this.setState({ data: null, loading: false, loadingHistory: false })
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
        return alert.enabled && alert.triggered;
    }
    render() {
        var { t } = this.props;
        let colorMode = this.props.colorMode.colorMode;
        return (
            <div>
                <Box className="content sensorCard" borderRadius="lg" overflow="hidden" _hover={{ shadow: "0px 0px 0px 2px rgba(1,174,144,0.3)" }} backgroundImage={colorMode === "dark" ? this.props.sensor.picture : undefined} backgroundSize="cover">
                    <Box backgroundImage={colorMode === "dark" ? sensorboxbg : undefined} padding="24px" height="360px" backgroundSize="cover">
                        <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold" }}>
                            {this.props.sensor.name}
                        </Heading>
                        {this.state.loading ? (
                            <center style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}>
                                <Spinner size="xl" />
                            </center>
                        ) : (
                            <div>
                                {this.state.lastParsedReading ? <div>
                                    <BigValue
                                        value={localeNumber(getUnitHelper("temperature").value(this.getLatestReading().temperature), getUnitHelper("temperature").decimals)}
                                        unit={getUnitHelper("temperature").unit}
                                        alertActive={this.isAlertTriggerd("temperature")}
                                    />
                                    <div style={{ marginLeft: -30, marginRight: -30, marginTop: -10, marginBottom: -10 }}>
                                        {this.state.data && this.state.data.measurements.length ? (
                                            <Graph title="" dataKey={this.state.graphDataKey} data={this.state.data.measurements} height={200} legend={false} cardView={true} from={new Date().getTime() - 60 * 60 * 1000 * this.props.dataFrom} />
                                        ) : (
                                            <>
                                                {this.state.loadingHistory ? (
                                                    <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: 200 }}><div style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}><Spinner size="xl" /></div></center>
                                                ) : (
                                                    <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: 200 }}><div style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}>{t("no_data_in_range").split("\n").map(x => <div key={x}>{x}</div>)}</div></center>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <hr style={{ margin: "0px 0 10px 0" }} />
                                    <SimpleGrid columns={2} style={{ width: "100%" }}>
                                        {["humidity", "battery", "pressure", "movementCounter"].map(x => {
                                            let value = this.getLatestReading()[x];
                                            if (value === undefined) return null;
                                            return <GridItem key={x} style={{ color: this.isAlertTriggerd(x) ? "#f27575" : undefined }}>
                                                <span style={smallSensorValue}>{value == null ? "-" : localeNumber(getUnitHelper(x).value(value, this.getLatestReading()["temperature"]), getUnitHelper(x).decimals)}</span>
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
                </Box>
                <div className="dashboardUpdatedAt" style={{ ...lastUpdatedText, width: "100%", textAlign: "right", marginTop: 5 }}>
                    <DurationText from={this.state.lastParsedReading ? this.state.lastParsedReading.timestamp : " - "} t={this.props.t} />
                </div>
            </div>
        )
    }
}

export default withTranslation()(withColorMode(SensorCard));