import React, { Component, useState } from "react";
import NetworkApi from '../NetworkApi'
import {
    Heading,
    Box,
    SimpleGrid,
    GridItem,
    Avatar,
    Flex,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "./Graph";
import parse from "../decoder/parser";
import { Spinner } from "@chakra-ui/react"
import { useTranslation, withTranslation } from 'react-i18next';
import { getDisplayValue, getUnitHelper, localeNumber } from "../UnitHelper";
import DurationText from "./DurationText";
import BigValue from "./BigValue";
import { withColorMode } from "../utils/withColorMode";
import bglayer from '../img/bg-layer.png';
import { MdAdd, MdCameraAlt, MdMoreVert } from "react-icons/md";
import uploadBackgroundImage from "../BackgroundUploader";
import { isBatteryLow } from "../utils/battery";
import lowBattery from '../img/low_battery.svg'
import { Link, useNavigate } from 'react-router-dom';
import { getAlertIcon, isAlerting } from "../utils/alertHelper";
import { ruuviTheme } from "../themes";
import { ArrowDownIcon, ArrowUpIcon } from "@chakra-ui/icons";
import UpgradePlanButton from './UpgradePlanButton';
import RemoveSensorDialog from "./RemoveSensorDialog";
import notify from "../utils/notify";

const smallSensorValue = {
    fontFamily: "montserrat",
    fontSize: 16,
    fontWeight: 600,
}

const smallSensorValueUnit = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 12,
    opacity: 0.8,
}

const lastUpdatedText = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 12,
}

function MoreMenu(props) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false)
    const handleButtonClick = (e) => {
        setIsOpen(!isOpen)
    }
    const doAction = (e, action) => {
        e.preventDefault()
        if (action === "share") props.share()
        else if (action === "change_background") props.uploadBg()
        else if (action === "rename") props.rename()
        else navigate('/' + props.sensor.sensor + "?scrollTo=" + action);
    }
    const moveCard = (e, dir) => {
        e.preventDefault()
        props.move(dir)
    }
    const removeSensor = (e) => {
        e.preventDefault()
        props.remove()
    }
    return <Menu autoSelect={false} isOpen={isOpen} onOpen={handleButtonClick} onClose={handleButtonClick} >
        <MenuButton as={IconButton} onClick={(e) => e.preventDefault() || handleButtonClick()} icon={<MdMoreVert size={23} />} variant="topbar" style={{ backgroundColor: "transparent" }} top={-4} right={props.simpleView ? 0 : -4} height={55} mt={props.mt}>
        </MenuButton>
        <MenuList mt="2" zIndex={10}>
            <MenuItem className="ddlItem" onClick={e => doAction(e, "history")}>{t("history_view")}</MenuItem>
            <MenuDivider />
            <MenuItem className="ddlItem" onClick={e => doAction(e, "settings")}>{t("settings_and_alerts")}</MenuItem>
            <MenuDivider />
            <MenuItem className="ddlItem" onClick={e => doAction(e, "change_background")}>{t("change_background")}</MenuItem>
            <MenuDivider />
            <MenuItem className="ddlItem" onClick={e => doAction(e, "rename")}>{t("rename")}</MenuItem>
            {props.sensor.canShare && <>
                <MenuDivider />
                <MenuItem className="ddlItem" onClick={e => doAction(e, "share")}>{t("share")}</MenuItem>
            </>}
            <MenuDivider />
            <MenuItem className="ddlItem" onClick={(e) => moveCard(e, 1)}><ArrowUpIcon mr={2} /> {t("move_up")}</MenuItem>
            <MenuDivider />
            <MenuItem className="ddlItem" onClick={(e) => moveCard(e, -1)}><ArrowDownIcon mr={2} /> {t("move_down")}</MenuItem>
            <MenuDivider />
            <MenuItem className="ddlItem" onClick={(e) => removeSensor(e, 1)}>{t("remove")}</MenuItem>
        </MenuList>
    </Menu>
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
            showRemoveDialog: false,
            errorFetchingData: false,
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
            Object.keys(this.props.sensor).filter(x => x.startsWith("offset")).forEach(x => {
                graphData.data[x] = this.props.sensor[x]
            })
            let d = parse(graphData.data);
            this.setState({ data: d, loading: false, loadingHistory: false, table: d.table, resolvedMode: d.resolvedMode, errorFetchingData: false })
        } else if (graphData.result === "error") {
            console.log(graphData.error)
            this.setState({ ...this.state, loading: false, loadingHistory: false, errorFetchingData: true })
        }
    }
    async loadData() {
        clearTimeout(this.fetchDataLoop);
        this.fetchDataLoop = setTimeout(() => {
            this.loadData()
        }, 60 * 1000 * (this.props.dataFrom > 1 ? 5 : 1));
        var graphDataMode = this.props.dataFrom <= 12 ? "mixed" : "sparse";
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
        if (type === "rssi") type = "signal";
        var alert = this.getAlert(type.toLocaleLowerCase())
        if (!alert || !alert.enabled) return -1
        if (isAlerting(this.props.sensor, type)) return 1
        return 0
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
    getSmallDataFields() {
        let arr = ["humidity", "pressure", "movementCounter"]
        if (this.getLatestReading().dataFormat === 6) arr = ["pm1p0", "co2", "voc"]
        if ((this.props.graphType || "temperature") !== "temperature") arr.push("temperature")
        return arr
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
        let alertIcon = getAlertIcon(this.props.sensor)

        const sensorHasData = () => {
            var lastParsedReading = this.props.sensor.measurements.length === 1 ? this.props.sensor.measurements[0] : null
            return lastParsedReading !== null
        }

        const isSharedSensor = () => {
            var user = new NetworkApi().getUser().email
            var owner = this.props.sensor.owner
            return user !== owner;
        }


        let tnpGetAlert = (x) => {
            let dataKey = x === "movement" ? "movementCounter" : "signal" ? "rssi" : x;
            if (this.getLatestReading()[dataKey] === undefined) return null;
            return this.getAlert(x)
        }

        let infoRow = <div className="dashboardUpdatedAt" style={{ ...lastUpdatedText, width: "100%" }}>
            <Flex justifyContent={"space-between"}>
                <span>
                    <DurationText from={latestReading ? latestReading.timestamp : " - "} t={this.props.t} isAlerting={this.getAlertState("offline") > 0} />
                </span>
                <Flex>
                    {latestReading && <>
                        {isBatteryLow(latestReading.battery, latestReading.temperature) ? <>{t("low_battery")}<img src={lowBattery} alt={t("low_battery")} style={{ display: "inline", alignSelf: "center", marginLeft: 8, height: "10px" }} /></> : ""}
                    </>
                    }
                </Flex>
            </Flex>
        </div>

        const moreDropdonw = <MoreMenu move={this.props.move} simpleView sensor={this.props.sensor} share={() => this.props.share()} uploadBg={() => {
            document.getElementById("fileinputlabel" + this.props.sensor.sensor).click()
        }} rename={this.props.rename} remove={() => this.setState({ ...this.state, showRemoveDialog: true })} />

        const altFileUplaod = <label htmlFor={"altup" + this.props.sensor.sensor} id={"fileinputlabel" + this.props.sensor.sensor}>
            <input type="file" accept="image/*" style={{ display: "none" }} id={"altup" + this.props.sensor.sensor} onChange={f => {
                this.setState({ ...this.state, loadingImage: true })
                uploadBackgroundImage(this.props.sensor, f, t, res => {
                    this.setState({ ...this.state, loadingImage: false })
                })
            }} />
        </label>

        let noHistoryStrKey = "no_data_in_range"
        let freeMode = this.props.sensor?.subscription.maxHistoryDays === 0
        if (freeMode) noHistoryStrKey = "no_data_free_mode"
        let noHistoryStr = t(noHistoryStrKey).split("\n").map(x => <div key={x}>{x}</div>)

        const removeSensorDialog =
            <RemoveSensorDialog open={this.state.showRemoveDialog} sensor={this.props.sensor} t={t} onClose={() => this.setState({ ...this.state, showRemoveDialog: false })} remove={() => {
                this.setState({ ...this.state, showRemoveDialog: false })
                notify.success(t(`sensor_removed`))
                this.props.remove()
            }} />

        const noData = (str) =>
            <div style={{ height: graphHeight, marginLeft: simpleView ? 0 : 24, marginRight: 30, paddingTop: simpleView ? 0 : 10 }} className="nodatatext">
                <div style={{ position: "relative", top: simpleView ? undefined : this.props.size === "medium" ? "44%" : "50%", transform: simpleView ? undefined : "translateY(-50%)" }}>
                    {str}
                    {freeMode && !isSharedSensor() && sensorHasData() && <><Box mt={2} /><UpgradePlanButton /></>}
                </div>
            </div>

        if (simpleView) {
            let stats = [mainStat]
            if (mainStat !== "humidity") stats.push("humidity")
            if (mainStat !== "pressure") stats.push("pressure")
            if (mainStat !== "temperature") stats.push("temperature")
            if (stats.lenght !== 4) stats.push("movementCounter")
            return (
                <div>
                    {altFileUplaod}
                    <Box className="content sensorCard" height={105} borderRadius="lg" overflow="hidden" padding={4} pt={3}>
                        <Flex>
                            <Flex grow={1} width="calc(100% - 40px)">
                                <Heading size="xs" style={{ lineHeight: 1, fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 2 }}>
                                    {this.props.sensor.name}
                                </Heading>
                            </Flex>
                            <Flex width="15px" mt={1}>
                                {alertIcon}
                            </Flex>
                            <Flex width="25px" height={'20px'}>
                                {moreDropdonw}
                            </Flex>
                        </Flex>
                        {latestReading ? <>
                            <SimpleGrid columns={2} style={{ width: "100%", height: "49px", overflow: "hidden", whiteSpace: "nowrap", opacity: 0.8 }}>
                                {stats.map(x => {
                                    let value = latestReading[x];
                                    if (value === undefined) return null;
                                    return <GridItem key={Math.random()} style={{ color: this.getAlertState(x) > 0 ? ruuviTheme.colors.sensorCardValueAlertState : undefined }}>
                                        <span style={smallSensorValue}>{value == null ? "-" : getDisplayValue(x, localeNumber(getUnitHelper(x).value(value, latestReading["temperature"]), getUnitHelper(x).decimals))}</span>
                                        <span style={smallSensorValueUnit}> {x === "movementCounter" ? t(getUnitHelper(x).unit.toLocaleLowerCase()) : getUnitHelper(x).unit}</span>
                                    </GridItem>
                                })}
                            </SimpleGrid>
                            {infoRow}
                        </> : <>
                            {noData(t("no_data").split("\n").map(x => <div key={x}>{x}</div>))}
                        </>}
                    </Box>
                    {removeSensorDialog}
                </div >
            )
        }
        return (
            <div>
                {altFileUplaod}
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
                                    <Flex grow={1} width="calc(100% - 41px)">
                                        <Link to={`/${this.props.sensor.sensor}`} style={{ width: "100%" }}>
                                            {isSmallCard ? (
                                                <Heading size="xs" style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", maxLines: 2, lineHeight: "19px", maxHeight: "38px", marginRight: 2 }}>
                                                    {this.props.sensor.name}
                                                </Heading>
                                            ) : (
                                                <Heading size="xs" style={{ lineHeight: 1, fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: 2 }}>
                                                    {this.props.sensor.name}
                                                </Heading>
                                            )}
                                        </Link>
                                    </Flex>
                                    <Flex width="20px" mt={1}>
                                        {alertIcon}
                                    </Flex>
                                    <Flex width="21px" height={'20px'}>
                                        {moreDropdonw}
                                    </Flex>
                                </Flex>
                                <Link to={`/${this.props.sensor.sensor}`}>
                                    {latestReading &&
                                        <BigValue
                                            value={getDisplayValue(mainStat, localeNumber(getUnitHelper(mainStat).value(latestReading[mainStat], mainStat === "humidity" ? latestReading.temperature : undefined), getUnitHelper(mainStat).decimals))}
                                            unit={getUnitHelper(mainStat).unit}
                                            alertActive={this.getAlertState(mainStat) > 0}
                                        />
                                    }
                                </Link>
                            </Box>
                            {this.state.loading ? (
                                <center style={{ position: "relative", top: "50%", marginTop: isSmallCard ? 0 : height / 3, transform: "translateY(-50%)" }}>
                                    <Spinner size="xl" />
                                </center>
                            ) : (
                                <div>
                                    <Link to={`/${this.props.sensor.sensor}`} >
                                        {latestReading ? <div>
                                            <div style={{ marginLeft: -24, marginRight: -30, marginTop: -10, marginBottom: -10, paddingBottom: -50 }}>
                                                {this.state.data && this.state.data.measurements.length ? (
                                                    <>
                                                        {showGraph &&
                                                            <Graph title="" key={this.props.sensor.sensor + this.props.cardType + mainStat} alert={tnpGetAlert(mainStat)} unit={getUnitHelper(mainStat).unit} dataKey={mainStat} data={this.getMeasurements()} height={graphHeight} legend={false} cardView={true} from={new Date().getTime() - 60 * 60 * 1000 * this.props.dataFrom} />
                                                        }
                                                    </>
                                                ) : (
                                                    <>
                                                        {showGraph && <>
                                                            {this.state.loadingHistory ? (
                                                                <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: graphHeight }}><div style={{ position: "relative", top: "50%", transform: "translateY(-50%)" }}><Spinner size="xl" /></div></center>
                                                            ) : showGraph && (
                                                                <>
                                                                    {noData(this.state.errorFetchingData ? "error" : noHistoryStr)}
                                                                </>
                                                            )}
                                                        </>}
                                                    </>
                                                )}
                                            </div>
                                            <div style={{ maxWidth: this.props.size === "mobile" && !this.props.showGraph ? "300px" : undefined }}>
                                                <SimpleGrid columns={2} style={{ width: "100%", overflow: "hidden", whiteSpace: "nowrap", margin: (showGraph ? this.props.size === "medium" ? -10 : 15 : this.props.size === "mobile" ? 8 : 20) + "px 0 0 0" }}>
                                                    {this.getSmallDataFields().map(x => {
                                                        let value = latestReading[x];
                                                        if (value === undefined) return null;
                                                        return <GridItem key={x} style={{ color: this.getAlertState(x) > 0 ? ruuviTheme.colors.sensorCardValueAlertState : undefined }}>
                                                            <span style={smallSensorValue}>{value == null ? "-" : getDisplayValue(x, localeNumber(getUnitHelper(x).value(value, latestReading["temperature"]), getUnitHelper(x).decimals))}</span>
                                                            <span style={smallSensorValueUnit}> {x === "movementCounter" ? t(getUnitHelper(x).unit.toLocaleLowerCase()) : getUnitHelper(x).unit}</span>
                                                        </GridItem>
                                                    })}
                                                </SimpleGrid>
                                            </div>
                                            {infoRow}
                                        </div> : <>
                                            <div style={{ marginLeft: -24, marginTop: height / 6 }}>
                                                {noData(t("no_data").split("\n").map(x => <div key={x}>{x}</div>))}
                                            </div>
                                        </>
                                        }
                                    </Link>
                                </div>
                            )}
                        </Box>
                    </Box>
                </Box>
                {removeSensorDialog}
            </div >
        )
    }
}

export default withTranslation()(withColorMode(SensorCard));