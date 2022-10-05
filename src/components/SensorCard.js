import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    Heading,
    Box,
    SimpleGrid,
    GridItem,
    Avatar,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "./Graph";
import parse from "../decoder/parser";
import { Spinner } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";
import DurationText from "./DurationText";
import BigValue from "./BigValue";
import { withColorMode } from "../utils/withColorMode";
import bglayer from '../img/bg-layer.png';
import { MdAdd, MdCameraAlt } from "react-icons/md";
import uploadBackgroundImage from "../BackgroundUploader";

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
            imageHover: false,
            loadingImage: false,
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
    setHover(state) {
        this.setState({
            ...this.state,
            imageHover: state,
            avatarHover: false
        });
    }
    render() {
        var { t } = this.props;
        let showGraph = this.props.showGraph;
        let showImage = this.props.showImage;
        if (!showGraph && this.props.size !== "mobile") showGraph = true
        let height = showGraph ? this.props.size === "medium" ? 300 : 360 : 200;
        let graphHeight = height - 180;
        let imageWidth = height / 2;
        let imageButtonSize = 80;
        if (this.props.size === "mobile") imageButtonSize = 60;
        if (this.props.size === "medium") graphHeight = 135;
        if (this.props.size === "mobile" && showGraph) showImage = false;
        return (
            <div>
                <Box className="content sensorCard" height={height} borderRadius="lg" overflow="hidden">
                    <Box height="100%" margin="auto">
                        {showImage &&
                            <Box float="left" width={imageWidth} className="imageBackgroundColor" position={"relative"} backgroundImage={this.props.sensor.picture} backgroundSize="cover" backgroundPosition="center" height="100%"
                                onMouseEnter={() => this.setHover(true)}
                                onMouseLeave={() => this.setHover(false)}>
                                <Box className="imageBackgroundOverlay" backgroundImage={bglayer} backgroundSize="cover" backgroundPosition="center" width={imageWidth} height={height}>
                                    <div style={{ height: "100%" }}>
                                    </div>
                                </Box>
                                {((!this.props.sensor.picture || (!this.props.sensor.picture && (this.state.imageHover)))) &&
                                    <Box>
                                        <label htmlFor={"up" + this.props.sensor.sensor}>
                                            <input type="file" accept="image/*" style={{ display: "none" }} id={"up" + this.props.sensor.sensor} onChange={f => {
                                                this.setState({ ...this.state, loadingImage: true })
                                                uploadBackgroundImage(this.props.sensor, f, t, res => {
                                                    this.setState({ ...this.state, loadingImage: false })
                                                })
                                            }} />
                                            <center style={{ position: "absolute", top: 0, bottom: 0, width: "100%", cursor: "pointer" }}>
                                                <Avatar bg="primary"
                                                    style={{ marginTop: height / 2 - imageButtonSize / 2 }}
                                                    height={imageButtonSize + "px"} width={imageButtonSize + "px"} icon={this.state.loadingImage ? <Spinner color="white" /> : this.state.imageHover ? <MdAdd size="30px" color="white" /> : <MdCameraAlt size="30px" color="white" />}
                                                />
                                                {this.props.size !== "mobile" && this.state.imageHover && <Box color="primary" mt="2" style={smallSensorValue}>Add image</Box>}
                                            </center>
                                        </label>
                                    </Box>
                                }
                            </Box>
                        }
                        <Box padding="24px" marginLeft={showImage ? imageWidth : 0}>
                            <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", whiteSpace: "nowrap" }}>
                                {this.props.sensor.name}
                            </Heading>
                            {this.state.loading ? (
                                <center style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}>
                                    <Spinner size="xl" />
                                </center>
                            ) : (
                                <div style={{ maxWidth: this.props.size === "mobile" && !this.props.showGraph ? "300px" : undefined }}>
                                    {this.state.lastParsedReading ? <div>
                                        <BigValue
                                            value={localeNumber(getUnitHelper("temperature").value(this.getLatestReading().temperature), getUnitHelper("temperature").decimals)}
                                            unit={getUnitHelper("temperature").unit}
                                            alertActive={this.isAlertTriggerd("temperature")}
                                        />
                                        <div style={{ marginLeft: -24, marginRight: -30, marginTop: -10, marginBottom: -10, paddingBottom: -50 }}>
                                            {this.state.data && this.state.data.measurements.length ? (
                                                <>
                                                    {showGraph &&
                                                        <Box height={graphHeight}>
                                                            <Graph title="" key={this.props.sensor.sensor} dataKey={this.state.graphDataKey} data={this.state.data.measurements} height={graphHeight} legend={false} cardView={true} from={new Date().getTime() - 60 * 60 * 1000 * this.props.dataFrom} />
                                                        </Box>
                                                    }
                                                </>
                                            ) : (
                                                <>
                                                    {this.state.loadingHistory ? (
                                                        <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: graphHeight }}><div style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}><Spinner size="xl" /></div></center>
                                                    ) : showGraph && (
                                                        <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: graphHeight }}><div style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}>{t("no_data_in_range").split("\n").map(x => <div key={x}>{x}</div>)}</div></center>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <SimpleGrid columns={2} style={{ width: "100%", margin: (showGraph ? this.props.size === "medium" ? -10 : 15 : 20) + "px 0 0 0" }}>
                                            {["humidity", "battery", "pressure", "movementCounter"].map(x => {
                                                let value = this.getLatestReading()[x];
                                                if (value === undefined) return null;
                                                return <GridItem key={x} style={{ color: this.isAlertTriggerd(x) ? "#f27575" : undefined }}>
                                                    <span style={smallSensorValue}>{value == null ? "-" : localeNumber(getUnitHelper(x).value(value, this.getLatestReading()["temperature"]), getUnitHelper(x).decimals)}</span>
                                                    <span style={smallSensorValueUnit}> {x === "movementCounter" ? t(getUnitHelper(x).unit.toLocaleLowerCase()) : getUnitHelper(x).unit}</span>
                                                </GridItem>
                                            })}
                                        </SimpleGrid>
                                        <div className="dashboardUpdatedAt" style={{ ...lastUpdatedText, width: "100%", marginTop: 5 }}>
                                            <DurationText from={this.state.lastParsedReading ? this.state.lastParsedReading.timestamp : " - "} t={this.props.t} />
                                        </div>
                                    </div> : <div>
                                        <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", marginTop: 100 }}>{t("no_data").split("\n").map(x => <div key={x}>{x}</div>)}</center>
                                    </div>}
                                </div>
                            )}
                        </Box>
                    </Box>
                </Box>
            </div >
        )
    }
}

export default withTranslation()(withColorMode(SensorCard));