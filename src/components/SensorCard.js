import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    Heading,
    Box,
    SimpleGrid,
    GridItem,
    Avatar,
    Flex,
    Image
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "./Graph";
import parse from "../decoder/parser";
import { Spinner } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import { getDisplayValue, getUnitHelper, localeNumber } from "../UnitHelper";
import DurationText from "./DurationText";
import BigValue from "./BigValue";
import { withColorMode } from "../utils/withColorMode";
import bglayer from '../img/bg-layer.png';
import { MdAdd, MdCameraAlt } from "react-icons/md";
import uploadBackgroundImage from "../BackgroundUploader";
import { isBatteryLow } from "../utils/battery";
import lowBattery from '../img/low_battery.svg'
import bell from '../img/icon-bell.svg'
import bellAlert from '../img/icon-bell-alert.svg'

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
    fontSize: 12,
}

class SensorCard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: null,
            lastParsedReading: null,
            loading: false,
            loadingHistory: true,
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
        if (this.props.sensor.subscription.maxHistoryDays === 0) {
            this.setState({ ...this.state, loading: false, loadingHistory: false })
            return
        }
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
        }, 60 * 1000 * (this.props.dataFrom > 1 ? 5 : 1));
        var graphDataMode = this.props.dataFrom <= 3 ? "mixed" : "sparse";
        try {
            this.loadGraphData(graphDataMode);
        } catch (e) {
            console.log("err", e)
            this.setState({ data: null, loading: false, loadingHistory: false })
        }
    }
    getLatestReading() {
        var lastParsedReading = this.props.sensor.measurements.length === 1 ? this.props.sensor.measurements[0] : null
        if (!lastParsedReading) return null;
        return { ...lastParsedReading.parsed, timestamp: lastParsedReading.timestamp };
    }
    getTimeSinceLastUpdate() {
        if (!this.state.data || !this.state.data.measurements.length) return " - ";
        var now = new Date().getTime() / 1000
        var lastUpdate = this.state.data.measurements[0].timestamp
        return Math.floor(((now - lastUpdate) / 60))
    }
    getAlert(type) {
        if (!this.props.sensor) return null
        if (type === "rssi") type = "signal"
        var idx = this.props.sensor.alerts.findIndex(x => x.type === type)
        if (idx !== -1) {
            return this.props.sensor.alerts[idx]
        }
        return null
    }
    getAlertState(type) {
        if (type === "movementCounter") type = "movement";
        var alert = this.getAlert(type.toLocaleLowerCase())
        if (!alert || !alert.enabled) return -1
        if (alert.triggered) return 1
        return 0
    }
    getSensorAlertState() {
        let alerts = this.props.sensor.alerts
        if (alerts.find(x => x.enabled && x.triggered)) return 1
        if (alerts.find(x => x.enabled)) return 0
        return -1
    }
    setHover(state) {
        this.setState({
            ...this.state,
            imageHover: state,
            avatarHover: false
        });
    }
    getMeasurements() {
        let measurements = JSON.parse(JSON.stringify(this.state.data.measurements));
        if (measurements && this.props.sensor.measurements.length) measurements = [this.props.sensor.measurements[0], ...measurements]
        return measurements
    }
    render() {
        var { t } = this.props;
        let showGraph = this.props.cardType === "graph_view";
        let showImage = this.props.cardType === "image_view";
        let simpleView = this.props.cardType === "simple_view";
        if (!showGraph && this.props.size !== "mobile") showGraph = true
        let height = showGraph ? this.props.size === "medium" ? 300 : 360 : 193;
        let graphHeight = height - 170;
        let imageWidth = height / 2;
        let imageButtonSize = 80;
        if (this.props.size === "mobile") imageButtonSize = 60;
        if (this.props.size === "medium") graphHeight = 145;
        if (this.props.size === "mobile" && showGraph) showImage = false;
        let isSmallCard = this.props.size === "mobile" && !showGraph
        let mainStat = this.props.graphType || "temperature";
        let latestReading = this.getLatestReading();
        let sensorAlertState = this.getSensorAlertState()
        let sensorSubscription = this.props.sensor.subscription
        let alertIcon = <></>
        if (sensorSubscription.emailAlertAllowed) {
            if (sensorAlertState === 0) alertIcon = <Image src={bell} width="15px" mt="-1" />
            if (sensorAlertState === 1) alertIcon = <Image src={bellAlert} width="15px" mt="-1" className="alarmFadeInOut" />
        }

        let infoRow = <div className="dashboardUpdatedAt" style={{ ...lastUpdatedText, width: "100%" }}>
            <Flex justifyContent={"space-between"}>
                <span>
                    <DurationText from={latestReading ? latestReading.timestamp : " - "} t={this.props.t} />
                </span>
                <Flex>
                    {latestReading && <>
                        {isBatteryLow(latestReading.battery, latestReading.temperature) ? <>{t("low_battery")}<img src={lowBattery} alt={t("low_battery")} style={{ display: "inline", alignSelf: "center", marginLeft: 8, height: "10px" }} /></> : ""}
                    </>
                    }
                </Flex>
            </Flex>
        </div>

        if (simpleView) {
            let stats = [mainStat]
            if (mainStat !== "humidity") stats.push("humidity")
            if (mainStat !== "pressure") stats.push("pressure")
            if (mainStat !== "temperature") stats.push("temperature")
            if (stats.lenght !== 4) stats.push("movementCounter")
            return (
                <div>
                    <Box className="content sensorCard" height={105} borderRadius="lg" overflow="hidden" padding={4}>
                        <Flex>
                            <Flex grow={1} width="calc(100% - 15px)">
                                <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: -4, marginRight: 2 }}>
                                    {this.props.sensor.name}
                                </Heading>
                            </Flex>
                            <Flex width="15px">
                                {alertIcon}
                            </Flex>
                        </Flex>
                        <SimpleGrid columns={2} style={{ width: "100%", height: "49px", overflow: "hidden", whiteSpace: "nowrap", opacity: 0.8 }}>
                            {stats.map(x => {
                                if (!latestReading) return null
                                let value = latestReading[x];
                                if (value === undefined) return null;
                                return <GridItem key={Math.random()} style={{ color: this.getAlertState(x) > 0 ? "#f27575" : undefined }}>
                                    <span style={smallSensorValue}>{value == null ? "-" : getDisplayValue(x, localeNumber(getUnitHelper(x).value(value, latestReading["temperature"]), getUnitHelper(x).decimals))}</span>
                                    <span style={smallSensorValueUnit}> {x === "movementCounter" ? t(getUnitHelper(x).unit.toLocaleLowerCase()) : getUnitHelper(x).unit}</span>
                                </GridItem>
                            })}
                        </SimpleGrid>
                        {infoRow}
                    </Box>
                </div >
            )
        }
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
                                                <Avatar
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
                            <Box height={isSmallCard && latestReading ? "98px" : ""}>
                                <Flex>
                                    <Flex grow={1} width="calc(100% - 15px)">
                                        {isSmallCard ? (
                                            <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", maxLines: 2, lineHeight: "19px", maxHeight: "38px", marginRight: 2 }}>
                                                {this.props.sensor.name}
                                            </Heading>
                                        ) : (
                                            <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 2 }}>
                                                {this.props.sensor.name}
                                            </Heading>
                                        )}
                                    </Flex>
                                    <Flex>
                                        {alertIcon}
                                    </Flex>
                                </Flex>
                                {latestReading &&
                                    <BigValue
                                        value={getDisplayValue(mainStat, localeNumber(getUnitHelper(mainStat).value(latestReading[mainStat], mainStat === "humidity" ? latestReading.temperature : undefined), getUnitHelper(mainStat).decimals))}
                                        unit={getUnitHelper(mainStat).unit}
                                        alertActive={this.getAlertState(mainStat) > 0}
                                    />
                                }
                            </Box>
                            {this.state.loading ? (
                                <center style={{ position: "relative", top: "50%", marginTop: isSmallCard ? 0 : height / 3, transform: "translateY(-50%)" }}>
                                    <Spinner size="xl" />
                                </center>
                            ) : (
                                <div>
                                    {latestReading ? <div>
                                        <div style={{ marginLeft: -24, marginRight: -30, marginTop: -10, marginBottom: -10, paddingBottom: -50 }}>
                                            {this.state.data && this.state.data.measurements.length ? (
                                                <>
                                                    {showGraph &&
                                                        <Graph title="" key={this.props.sensor.sensor + this.props.cardType + mainStat} dataKey={mainStat} data={this.getMeasurements()} height={graphHeight} legend={false} cardView={true} from={new Date().getTime() - 60 * 60 * 1000 * this.props.dataFrom} />
                                                    }
                                                </>
                                            ) : (
                                                <>
                                                    {showGraph && <>
                                                        {this.state.loadingHistory ? (
                                                            <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: graphHeight }}><div style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}><Spinner size="xl" /></div></center>
                                                        ) : showGraph && (
                                                            <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: graphHeight }}><div style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}>{t("no_data_in_range").split("\n").map(x => <div key={x}>{x}</div>)}</div></center>
                                                        )}
                                                    </>}
                                                </>
                                            )}
                                        </div>
                                        <div style={{ maxWidth: this.props.size === "mobile" && !this.props.showGraph ? "300px" : undefined }}>
                                            <SimpleGrid columns={2} style={{ width: "100%", overflow: "hidden", whiteSpace: "nowrap", margin: (showGraph ? this.props.size === "medium" ? -10 : 15 : this.props.size === "mobile" ? 8 : 20) + "px 0 0 0" }}>
                                                {["humidity", "pressure", "movementCounter", ...[mainStat !== "temperature" ? "temperature" : undefined]].map(x => {
                                                    let value = latestReading[x];
                                                    if (value === undefined) return null;
                                                    return <GridItem key={x} style={{ color: this.getAlertState(x) > 0 ? "#f27575" : undefined }}>
                                                        <span style={smallSensorValue}>{value == null ? "-" : getDisplayValue(x, localeNumber(getUnitHelper(x).value(value, latestReading["temperature"]), getUnitHelper(x).decimals))}</span>
                                                        <span style={smallSensorValueUnit}> {x === "movementCounter" ? t(getUnitHelper(x).unit.toLocaleLowerCase()) : getUnitHelper(x).unit}</span>
                                                    </GridItem>
                                                })}
                                            </SimpleGrid>
                                        </div>
                                        {infoRow}
                                    </div> : <div>
                                        <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", marginTop: height / (isSmallCard ? 6 : 4) }}>{t("no_data").split("\n").map(x => <div key={x}>{x}</div>)}</center>
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