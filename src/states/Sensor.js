import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    Heading,
    Button,
    IconButton,
    Box,
    Avatar,
    List,
    ListItem,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    useMediaQuery,
    CircularProgress,
    Spinner,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "../components/Graph";
import SensorReading from "../components/SensorReading";
import parse from "../decoder/parser";
import { MdChevronRight, MdInfo } from "react-icons/md"
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";
import { exportCSV } from "../utils/export";
import withRouter from "../utils/withRouter"
import DurationText from "../components/DurationText";
import Store from "../Store";
import ShareDialog from "../components/ShareDialog";
import EditNameDialog from "../components/EditNameDialog";
import { addNewlines, addVariablesInString, uppercaseFirst } from "../TextHelper";
import AlertItem from "../components/AlertItem";
import EditableText from "../components/EditableText";
import OffsetDialog from "../components/OffsetDialog";
import NavClose from "../components/NavClose";
import NavPrevNext from "../components/NavPrevNext";
import DurationPicker from "../components/DurationPicker";
import notify from "../utils/notify"
import pjson from '../../package.json';
import { isBatteryLow } from "../utils/battery";
import uploadBackgroundImage from "../BackgroundUploader";

var mainSensorFields = ["temperature", "humidity", "pressure", "movementCounter", "battery", "accelerationX", "accelerationY", "accelerationZ", "rssi", "measurementSequenceNumber"];
var sensorInfoOrder = ["mac", "dataFormat", "txPower"];

const graphInfo = {
    fontFamily: "mulish",
    fontSize: 14,
    marginLeft: "30px",
    marginBottom: "-20px",
}
const sensorName = {
    fontFamily: "montserrat",
    fontSize: "54px",
    fontWeight: 800,
}
const sensorNameMobile = {
    fontFamily: "montserrat",
    fontSize: "32px",
    fontWeight: 800,
}
const graphLengthText = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
    marginLeft: "30px"
}
const collapseText = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
    padding: "10px",
}
const detailedTitle = {
    fontFamily: "mulish",
    fontSize: "16px",
    fontWeight: 800,
    width: "50%",
}
const detailedText = {
    fontFamily: "mulish",
    fontSize: "14px",
    width: "100%",
    textAlign: "right",
    verticalAlign: "middle",
}
const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

const accordionPanel = {
    paddingTop: 0,
    paddingBottom: 0,
}
const accordionContent = {
    minHeight: 72,
    marginLeft: 10,
    width: "calc(100% - 16px)",
}
const accordionButton = {
    paddingRight: 21,
}

const graphLoadingOverlay = {
    position: "absolute",
    width: "100%",
    height: "450px",
    zIndex: 1,
}

const graph = {
    position: "relative",
    zIndex: 0,
    float: "left",
    width: "100%",
    height: "450px"
}

function AccordionText(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)")
    let tstyle = JSON.parse(JSON.stringify(collapseText));
    if (!isLargeDisplay) tstyle.fontSize = "18px";
    return <Box flex="1" textAlign="left" style={tstyle}>
        {props.children}
    </Box>
}

function SensorHeader(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)")
    if (isLargeDisplay) {
        return <div style={{ display: "flex", justifyContent: "space-between" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
            <label htmlFor="avatarUpload">
                {props.loadingImage ? <CircularProgress size={"96px"} isIndeterminate={true} color="primary" /> :
                    <Avatar style={{ cursor: "pointer" }} size="xl" name={props.sensor.name} src={props.testImgSrc || props.sensor.picture} />
                }
            </label>
            <span style={{ width: "100%", marginLeft: 18 }}>
                <Heading style={sensorName}>
                    {props.sensor.name}
                </Heading>
                <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }} className="subtitle">
                    <DurationText from={props.lastUpdateTime} t={props.t} />
                </div>
            </span>
            <span style={{ minWidth: 135, justifyContent: "flex-end" }}>
                <NavPrevNext prev={props.prev} next={props.next} />
                <NavClose />
            </span>
        </div>
    } else {
        return <center>
            <Box m={2}>
                <table width="100%" border="0" cellSpacing="0" cellPadding="0">
                    <tbody>
                        <tr>
                            <td width="33%" style={{ verticalAlign: "top" }}>
                                <NavClose />
                            </td>
                            <td width="33%" align="center">
                                <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
                                <label htmlFor="avatarUpload">
                                    {props.loadingImage ? <CircularProgress mt="3" size={"64px"} isIndeterminate={true} color="primary" /> :
                                        <Avatar mt="3" bg="primary" size="lg" name={props.sensor.name} src={props.sensor.picture} />
                                    }
                                </label>
                            </td>
                            <td width="33%" align="right" style={{ verticalAlign: "top" }}>
                                <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                                    <NavPrevNext prev={props.prev} next={props.next} />
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ width: "65%", marginTop: "5px" }}>
                    <Heading style={sensorNameMobile}>
                        {props.sensor.name}
                    </Heading>
                    <div style={{ fontFamily: "mulish", fontSize: 16, fontWeight: 600, fontStyle: "italic" }} className="subtitle">
                        <DurationText from={props.lastUpdateTime} t={props.t} />
                    </div>
                </div>
            </Box>
        </center>
    }
}

function SensorValueGrid(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)")
    return <Box style={{ marginBottom: 30, marginTop: 30 }} justifyItems="start" display="grid" gap="10px" gridTemplateColumns={`repeat(auto-fit, minmax(${isLargeDisplay ? "220px" : "45%"}, max-content))`}>
        {props.children}
    </Box>
}

class Sensor extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: null,
            loading: true,
            graphKey: "temperature",
            from: new Store().getGraphFrom() || 24,
            table: "",
            resolvedMode: "",
            editName: false,
            showShare: false,
            offsetDialog: null,
            loadingImage: false,
        }
        this.isLoading = false;
        this.applyAccordionSetting()
    }
    applyAccordionSetting() {
        this.openAccodrions = new Store().getOpenAccordions() || [0];
    }
    componentDidMount() {
        window.scrollTo(0, 0)
        if (this.props.sensor) {
            this.loadData(true)
        }
    }
    componentWillUnmount() {
        clearTimeout(this.latestDataUpdate);
    }
    componentDidUpdate(prevProps) {
        document.title = "Ruuvi Sensor: " + this.props.sensor.name
        if (this.props.sensor.sensor !== prevProps.sensor.sensor) {
            this.applyAccordionSetting()
            this.isLoading = false;
            this.loadData(true, true)
        }
    }
    getDataMode() {
        return "mixed"
    }
    async loadData(showLoading, clearLast) {
        if (this.isLoading) return
        clearTimeout(this.latestDataUpdate);
        this.latestDataUpdate = setTimeout(() => {
            this.loadData()
        }, 60 * 1000);
        let newState = { ...this.state, loading: showLoading !== undefined, ...(showLoading ? { data: null } : {}) };
        if (clearLast) {
            newState.lastestDatapoint = null;
        }
        this.setState(newState)
        try {
            let dataMode = this.getDataMode();
            var thisFrom = this.state.from;
            var that = this;
            async function load(until, initialLoad) {
                that.isLoading = true;
                var since = parseInt(((new Date().getTime()) / 1000) - 60 * 60 * that.state.from);
                if (!until) until = Math.floor(new Date().getTime() / 1000);
                if (!initialLoad && that.state.data.measurements.length) since = that.state.data.measurements[0].timestamp + 1;
                if (until <= since) {
                    that.isLoading = false;
                    return;
                }
                var resp = await new NetworkApi().getAsync(that.props.sensor.sensor, since, until, { mode: dataMode, limit: pjson.settings.dataFetchPaginationSize });
                that.isLoading = false;
                // stop fetching data if sensor page has changed
                if (that.props.sensor.sensor !== resp.data.sensor) return;
                if (that.state.from !== thisFrom) return;
                if (resp.result === "success") {
                    let d = parse(resp.data);
                    var stateData = that.state.data;
                    // no data
                    if (!stateData && d.measurements.length === 0) {
                        that.setState({ ...that.state, data: d, loading: false })
                        return
                    }
                    // looks like timerange has changed, stop
                    if (!d.measurements && d.measurements[d.measurements.length - 1].timestamp < since) return;
                    if (!stateData) stateData = d;
                    else if (initialLoad && stateData.measurements.length) {
                        stateData.measurements = stateData.measurements.concat(d.measurements)
                    }
                    else {
                        // data refresh, add new once to the beginning of the array
                        stateData.measurements = [...d.measurements, ...stateData.measurements]
                    }
                    that.setState({ ...that.state, data: stateData, loading: false, table: d.table, resolvedMode: d.resolvedMode })
                    if (initialLoad && (d.fromCache || d.measurements.length >= pjson.settings.dataFetchPaginationSize)) load(d.measurements[d.measurements.length - 1].timestamp, initialLoad)
                } else if (resp.result === "error") {
                    notify.error(that.props.t(`UserApiError.${resp.code}`))
                    that.setState({ ...that.state, loading: false })
                }
            }
            load(null, this.state.data === null || showLoading, true)
        } catch (e) {
            notify.error(this.props.t("internet_connection_problem"))
            console.log("err", e)
            this.setState({ ...this.state, loading: false })
        }
    }
    getLatestReadingFromProps() {
        var lastParsedReading = this.props.sensor.measurements.length === 1 ? this.props.sensor.measurements[0] : null
        if (!lastParsedReading) return null;
        return { ...lastParsedReading.parsed, timestamp: lastParsedReading.timestamp };
    }
    getLatestReading(kv) {
        let ms = this.getLatestReadingFromProps()
        if (!ms) return [];
        if (!kv) return ms;
        var objs = Object.keys(ms);
        return objs.map(x => {
            return { key: x, value: ms[x] }
        })
    }
    getTimeSinceLastUpdate() {
        if (!this.state.data || !this.state.data.measurements.length) return " - ";
        var now = new Date().getTime() / 1000
        var lastUpdate = this.state.data.measurements[0].timestamp
        return Math.floor(((now - lastUpdate)))
    }
    updateStateVar(key, value) {
        var state = this.state;
        state[key] = value;
        this.setState(this.state)
    }
    update() {
        new NetworkApi().update(this.props.sensor.sensor, this.state.editName, success => {
            window.location.reload()
        })
    }
    setGraphKey(key) {
        this.setState({ ...this.state, graphKey: key });
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
    isAlertTriggerd(type) {
        if (type === "movementCounter") type = "movement";
        var alert = this.getAlert(type.toLocaleLowerCase())
        if (!alert) return false
        return alert.enabled && alert.triggered;
    }
    isSharedSensor() {
        var user = new NetworkApi().getUser().email
        var owner = this.props.sensor.owner
        return user !== owner;
    }
    remove() {
        var confirmText = this.props.t("remove_claimed_sensor")
        if (this.isSharedSensor()) {
            confirmText = this.props.t("remove_shared_sensor")
        }
        var mac = this.props.sensor.sensor
        if (window.confirm(confirmText)) {
            new NetworkApi().unclaim(mac, resp => {
                if (resp.result === "success") {
                    this.props.remove();
                } else {
                    notify.error(`UserApiError.${this.props.t(resp.code)}`)
                }
            }, fail => {
                notify.error(this.props.t("something_went_wrong"))
                console.log(fail)
            })
        }
    }
    updateFrom(v) {
        this.isLoading = false
        this.setState({ ...this.state, data: null, from: v, loading: false }, () => this.loadData(false))
        new Store().setGraphFrom(v)
    }
    share(state) {
        this.setState({ ...this.state, showShare: state })
    }
    editName(state) {
        this.setState({ ...this.state, editName: state })
    }
    updateAlert(alert, prevEnabled) {
        var offToOn = alert.enabled;
        let sensor = JSON.parse(JSON.stringify(this.props.sensor))
        var alertIdx = sensor.alerts.findIndex(x => x.sensor === alert.sensor && x.type === alert.type)
        if (alertIdx !== -1) {
            offToOn = !prevEnabled && alert.enabled
            sensor.alerts[alertIdx] = alert
            this.props.updateSensor(sensor)
        }
        new NetworkApi().setAlert({ ...alert, sensor: this.props.sensor.sensor }, resp => {
            switch (resp.result) {
                case "success":
                    notify.success(this.props.t(offToOn ? "alert_enabled" : "successfully_saved"))
                    break
                case "error":
                    notify.error(this.props.t(`UserApiError.${resp.code}`))
                    break;
                default:
            }
        })
    }
    export() {
        exportCSV(this.state.data, this.props.sensor.name, this.props.t)
    }
    setOpenAccordion(open) {
        new Store().setOpenAccordions(open)
    }
    zoomInfo() {
        notify.info(addNewlines(this.props.t("zoom_info")))
    }
    getGraphData() {
        if (!this.state.data?.measurements?.length) return []
        let data = this.state.data.measurements;
        if (this.getDataMode() === "dense") return data;
        let latestDP = this.state.lastestDatapoint;
        if (latestDP && latestDP.measurements.length) data.unshift(latestDP.measurements[0])
        return data;
    }
    getSelectedUnit() {
        if (this.state.graphKey === "measurementSequenceNumber") return "";
        let unit = getUnitHelper(this.state.graphKey).unit
        if (this.state.graphKey === "movementCounter") return `(${this.props.t(unit)})`;
        return <>({unit})</>
    }
    render() {
        var { t } = this.props
        let lastReading = this.getLatestReading()
        let sensorSubscription = this.props.sensor?.subscription.subscriptionName
        return (
            <Box>
                <Box minHeight={1500}>
                    <Box overflow="hidden" pt={{ base: "5px", md: "35px" }} backgroundPosition="center" paddingLeft={{ base: "10px", md: "20px", lg: "50px" }} paddingRight={{ base: "10px", md: "20px", lg: "50px" }}>
                        <SensorHeader {...this.props} lastUpdateTime={lastReading ? lastReading.timestamp : " - "} editName={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)}
                            loadingImage={this.state.loadingImage}
                            fileUploadChange={f => {
                                this.setState({ ...this.state, loadingImage: true })
                                uploadBackgroundImage(this.props.sensor, f, t, res => {
                                    this.setState({ ...this.state, loadingImage: false })
                                })
                            }}
                        />
                        <div>
                            <SensorValueGrid>
                                {mainSensorFields.map(x => {
                                    let value = this.getLatestReading()[x];
                                    if (value === undefined) return null;
                                    return <SensorReading key={x} value={this.getLatestReading()[x] == null ? "-" : localeNumber(getUnitHelper(x).value(this.getLatestReading()[x], this.getLatestReading()["temperature"]), getUnitHelper(x).decimals)}
                                        info={x !== "battery" ? undefined : isBatteryLow(this.getLatestReading()[x], this.getLatestReading().temperature) ? "replace_battery" : "battery_ok"}
                                        alertTriggered={this.isAlertTriggerd(x)}
                                        label={getUnitHelper(x).label}
                                        unit={getUnitHelper(x).unit}
                                        selected={this.state.graphKey === x}
                                        onClick={() => this.setGraphKey(x)} />
                                })}
                            </SensorValueGrid>
                            <div style={{ marginTop: 30, marginBottom: 20 }}>
                                <table width="100%">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <div style={graphLengthText}>
                                                    {t("history")}
                                                </div>
                                                <div style={graphInfo}>
                                                    {t("selected")}: {t(getUnitHelper(this.state.graphKey).label)} {this.getSelectedUnit()}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <span style={detailedSubText}>{`${uppercaseFirst(t("zoom"))}`}</span>
                                                <IconButton ml="-8px" variant="ghost" onClick={() => this.zoomInfo()}>
                                                    <MdInfo size="16" className="buttonSideIcon" />
                                                </IconButton>
                                                <Button disabled={this.isLoading} variant='link' ml="10px" mr="24px" style={detailedSubText} onClick={() => this.export()}>{`${uppercaseFirst(t("export"))} CSV`}</Button>
                                                <DurationPicker value={this.state.from} onChange={v => this.updateFrom(v)} />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <Box height={520}>
                                <> {!this.isLoading && (!this.state.data || !this.state.data?.measurements?.length) ? (
                                    <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", paddingTop: 240, height: 450 }}>{t("no_data_in_range")}</center>
                                ) : (
                                    <Box ml={-5} mr={-5}>
                                        {this.isLoading &&
                                            <div style={graphLoadingOverlay}>
                                                <div style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: "100%", textAlign: "center" }}><div style={{ position: "relative", top: "45%" }}><Spinner size="xl" /></div></div>
                                            </div>
                                        }
                                        <div style={graph}>
                                            {this.state.data?.measurements?.length &&
                                                <Graph key={"sensor_graph"} dataKey={this.state.graphKey} points={new Store().getGraphDrawDots()} dataName={t(getUnitHelper(this.state.graphKey).label)} data={this.getGraphData()} height={450} cursor={true} from={new Date().getTime() - this.state.from * 60 * 60 * 1000} />
                                            }
                                        </div>
                                    </Box>
                                )}
                                </>
                            </Box>
                        </div>
                    </Box>
                    <Box>
                        <div style={{ height: "20px" }} />
                        <Accordion allowMultiple defaultIndex={this.openAccodrions} onChange={v => this.setOpenAccordion(v)}>
                            <AccordionItem onChange={v => console.log(v)}>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("general")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        <ListItem>
                                            <table style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>
                                                            {t("sensor_name")}
                                                        </td>
                                                        <td style={detailedText}>
                                                            <EditableText text={this.props.sensor.name} onClick={() => this.editName(true)} />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </ListItem>
                                        <hr />
                                        <ListItem>
                                            <table style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>
                                                            {t("owner")}
                                                        </td>
                                                        <td style={detailedText}>
                                                            {this.props.sensor.owner}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </ListItem>
                                        {this.props.sensor.canShare &&
                                            <>
                                                <hr />
                                                <ListItem style={{ cursor: "pointer" }} onClick={() => this.share(true)}>
                                                    <table style={accordionContent}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={detailedTitle}>
                                                                    {t("share")}
                                                                </td>
                                                                <td style={detailedText}>
                                                                    {addVariablesInString(t("shared_to_x"), [this.props.sensor.sharedTo.length, pjson.settings.maxSharesPerSensor])}
                                                                    <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </ListItem>
                                            </>
                                        }
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("alerts")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List style={accordionContent}>
                                        {sensorSubscription === "Free" && <Box pt={6} style={detailedSubText}>
                                            {(() => {
                                                let text = t("sensor_alert_free_info")
                                                let parts = text.split(t("cloud_ruuvi_link"))
                                                return <div>{parts[0]}<a style={{ color: "teal" }} target="blank" href={t("cloud_ruuvi_link_url")}>{t("cloud_ruuvi_link")}</a>{parts[1]}</div>
                                            })()}
                                        </Box>}
                                        {["temperature", "humidity", "pressure", "signal", "movement"].map(x => {
                                            let dataKey = x === "movement" ? "movementCounter" : "signal" ? "rssi" : x;
                                            if (this.getLatestReading()[dataKey] === undefined) return null;
                                            var alert = this.getAlert(x)
                                            let key = alert ? alert.min + "" + alert.max + "" + alert.enabled.toString() + "" + alert.description : x
                                            return <AlertItem key={key} alerts={this.props.sensor.alerts} alert={alert}
                                                detailedTitle={detailedTitle}
                                                detailedText={detailedText} detailedSubText={detailedSubText}
                                                type={x} onChange={(a, prevEnabled) => this.updateAlert(a, prevEnabled)} />
                                        })}
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem hidden={this.isSharedSensor()}>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("offset_correction")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        {["Temperature", "Humidity", "Pressure"].map(x => {
                                            if (this.getLatestReading()[x.toLowerCase()] === undefined) return null;
                                            var uh = getUnitHelper(x.toLocaleLowerCase());
                                            var value = uh.value(this.props.sensor["offset" + x], true);
                                            var unit = uh.unit;
                                            if (x === "Humidity") {
                                                // humidity offset is always %
                                                value = this.props.sensor["offset" + x]
                                                unit = "%"
                                            }
                                            return <ListItem key={x} style={{ cursor: "pointer" }} onClick={() => this.setState({ ...this.state, offsetDialog: x })}>
                                                <table style={accordionContent}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={detailedTitle}> {t(x.toLocaleLowerCase())}</td>
                                                            <td style={detailedText}>
                                                                {localeNumber(value, uh.decimals)} {unit} <IconButton _hover={{}} variant="ghost" icon={<MdChevronRight />} />
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                                {x !== "Pressure" && <hr />}
                                            </ListItem>
                                        })}
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {uppercaseFirst(t("more_info"))}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        {sensorInfoOrder.map((order, i) => {
                                            var x = this.getLatestReading(true).find(x => x.key === order);
                                            if (!x) return null
                                            let uh = getUnitHelper(x.key)
                                            return (
                                                <ListItem key={x.key}>
                                                    <table style={{ ...accordionContent, cursor: uh.graphable ? "pointer" : "" }} onClick={() => uh.graphable ? this.setGraphKey(x.key) : console.log("Not graphable")}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={detailedTitle}> {t(uh.label || x.key)}</td>
                                                                <td style={{ ...detailedText, textDecoration: uh.graphable ? "underline" : "" }}>
                                                                    {localeNumber(uh.value(x.value), uh.decimals)} {uh.unit}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    {i !== sensorInfoOrder.length - 1 && <hr />}
                                                </ListItem>
                                            )
                                        })}
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>

                            <AccordionItem>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("remove")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        <ListItem style={{ cursor: "pointer" }} onClick={() => this.remove()}>
                                            <table width="100%" style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>
                                                            {t("remove_this_sensor")}
                                                        </td>
                                                        <td style={detailedText}>
                                                            <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </ListItem>
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>
                        </Accordion>
                    </Box>
                    <EditNameDialog open={this.state.editName} onClose={() => this.editName(false)} sensor={this.props.sensor} updateSensor={this.props.updateSensor} />
                    <ShareDialog open={this.state.showShare} onClose={() => this.share(false)} sensor={this.props.sensor} updateSensor={this.props.updateSensor} />
                    <OffsetDialog open={this.state.offsetDialog} onClose={() => this.setState({ ...this.state, offsetDialog: null })} sensor={this.props.sensor} offsets={{ "Humidity": this.props.sensor.offsetHumidity, "Pressure": this.props.sensor.offsetPressure, "Temperature": this.props.sensor.offsetTemperature }} lastReading={this.getLatestReading()} updateSensor={this.props.updateSensor} />
                </Box>
            </Box>
        )
    }
}

export default withRouter(withTranslation()(Sensor));