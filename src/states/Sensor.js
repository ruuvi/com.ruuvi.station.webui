import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    StatGroup,
    Heading,
    Stack,
    Button,
    IconButton,
    Box,
    Avatar,
    Progress,
    List,
    ListItem,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    useMediaQuery,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "../components/Graph";
import SensorReading from "../components/SensorReading";
import parse from "../decoder/parser";
import { MdChevronRight, MdInfo } from "react-icons/md"
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";
import { exportCSV } from "../utils/export";
import { withRouter } from 'react-router-dom';
import DurationText from "../components/DurationText";
import Store from "../Store";
import ShareDialog from "../components/ShareDialog";
import EditNameDialog from "../components/EditNameDialog";
import { addNewlines, uppercaseFirst } from "../TextHelper";
import AlertItem from "../components/AlertItem";
import EditableText from "../components/EditableText";
import OffsetDialog from "../components/OffsetDialog";
import NavClose from "../components/NavClose";
import NavPrevNext from "../components/NavPrevNext";
import DurationPicker, { getTimespan } from "../components/DurationPicker";
import notify from "../utils/notify"
import { ruuviTheme } from "../themes";
import pjson from '../../package.json';

var bigCardFields = ["temperature", "humidity", "pressure", "movementCounter"];
var sensorInfoOrder = ["mac", "dataFormat", "battery", "accelerationX", "accelerationY", "accelerationZ", "txPower", "rssi", "measurementSequenceNumber"];

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
    backgroundColor: "#f6fcfb",
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

function SensorHeader(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)")
    if (isLargeDisplay) {
        return <div style={{display: "flex", justifyContent: "space-between"}}>
            <Avatar bg="primary" size="xl" name={props.sensor.name} src={props.sensor.picture} />
            <span style={{width: "100%", marginLeft: 8}}>
                <Heading style={sensorName}>
                    {props.sensor.name}
                </Heading>
                <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }}>
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
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td width="33%" style={{ verticalAlign: "top" }}>
                            <NavClose />
                        </td>
                        <td width="33%" align="center">
                            <Avatar bg="primary" size="lg" name={props.sensor.name} src={props.sensor.picture} />
                        </td>
                        <td width="33%" align="right" style={{ verticalAlign: "top" }}>
                            <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                                <NavPrevNext prev={props.prev} next={props.next} />
                            </span>
                        </td>
                    </tr>
                </table>
                <div style={{ width: "65%", marginTop: "5px" }}>
                    <Heading style={sensorNameMobile}>
                        {props.sensor.name}
                    </Heading>
                    <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }}>
                        <DurationText from={props.lastUpdateTime} t={props.t} />
                    </div>
                </div>
            </Box>
        </center>
    }
}

class Sensor extends Component {
    constructor(props) {
        super(props)
        this.state = {
            data: null,
            lastestDatapoint: null,
            loading: true,
            graphKey: "temperature",
            from: new Store().getGraphFrom() || 24,
            table: "",
            resolvedMode: "",
            alerts: [],
            editName: false,
            showShare: false,
            offsetDialog: null,
            graphRenderKey: 0,
        }
        this.applyAccordionSetting()
    }
    applyAccordionSetting() {
        this.openAccodrions = new Store().getOpenAccordions() || [0, 1, 2, 3, 4];
    }
    componentDidMount() {
        if (this.props.sensor) {
            this.loadData(true)
        }
    }
    componentWillUnmount() {
        clearTimeout(this.latestDataUpdate);
    }
    componentDidUpdate(prevProps) {
        document.title = "Ruuvi Sensor: " + this.props.sensor.name
        if (this.props.sensor !== prevProps.sensor) {
            this.applyAccordionSetting()
            this.loadData(true)
        }
    }
    getDataMode() {
        return this.state.from > 24 ? "sparse" : "dense";
    }
    async loadData(showLoading) {
        clearTimeout(this.latestDataUpdate);
        this.latestDataUpdate = setTimeout(() => {
            this.loadData()
        }, 60 * 1000);
        this.setState({ ...this.state, loading: showLoading !== undefined, ...(showLoading ? { data: null } : {}) })
        new NetworkApi().getAlerts(data => {
            if (data.result === "success") {
                var sensor = data.data.sensors.find(x => x.sensor === this.props.sensor.sensor)
                if (sensor) this.setState({ ...this.state, alerts: sensor.alerts })
            }
            try {
                (async () => {
                    let lastestDatapoint = await new NetworkApi().getLastestDataAsync(this.props.sensor.sensor)
                    if (lastestDatapoint.result === "success") {
                        this.setState({ ...this.state, lastestDatapoint: lastestDatapoint.data })
                    }
                })()
                let dataMode = this.getDataMode();
                var thisFrom = this.state.from;
                var that = this;
                async function load(until, initialLoad) {
                    var since = parseInt(((new Date().getTime()) / 1000) - 60 * 60 * that.state.from);
                    if (!until) until = Math.floor(new Date().getTime() / 1000);
                    if (!initialLoad && that.state.data.measurements.length) since = that.state.data.measurements[0].timestamp + 1;
                    if (until <= since) return;
                    var resp = await new NetworkApi().getAsync(that.props.sensor.sensor, since, until, { mode: dataMode, limit: pjson.settings.dataFetchPaginationSize });
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
                            stateData.latestTimestamp = stateData.measurements[0].timestamp
                        }
                        that.setState({ ...that.state, data: stateData, loading: false, table: d.table, resolvedMode: d.resolvedMode })
                        if (initialLoad && d.measurements.length >= pjson.settings.dataFetchPaginationSize) load(d.measurements[d.measurements.length - 1].timestamp, initialLoad)
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
        })
    }
    getLatestReading(kv) {
        if (!this.state.lastestDatapoint) return [];
        var ms = this.state.lastestDatapoint.measurements;
        if (!ms || !ms.length) return [];
        ms = ms[0].parsed;
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
        var idx = this.state.alerts.findIndex(x => x.type === type)
        if (idx !== -1) {
            return this.state.alerts[idx]
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
        this.setState({ ...this.state, data: null, from: v }, () => this.loadData(true))
        new Store().setGraphFrom(v)
    }
    share(state) {
        this.setState({ ...this.state, showShare: state })
    }
    editName(state) {
        this.setState({ ...this.state, editName: state })
    }
    updateAlert(alert, prevEnabled) {
        var offToOn = true;
        var alerts = this.state.alerts;
        var alertIdx = alerts.findIndex(x => x.sensor === alert.sensor && x.type === alert.type)
        if (alertIdx !== -1) {
            offToOn = !prevEnabled && alert.enabled
            alerts[alertIdx] = alert
            this.setState({ ...this.state, alerts: alerts });
            this.props.setAlerts(alerts)
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
        exportCSV(this.state.data, this.props.sensor.name)
    }
    setOpenAccordion(open) {
        new Store().setOpenAccordions(open)
    }
    resetZoom() {
        this.setState({ ...this.state, graphRenderKey: Math.random() })
    }
    zoomInfo() {
        notify.info(addNewlines(this.props.t("zoom_info")))
    }
    getGraphData() {
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
        return (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" pt={{ base: "5px", md: "35px" }} pl={{ base: "5px", md: "35px" }} pr={{ base: "5px", md: "35px" }} style={{ backgroundColor: "white" }}>
                <SensorHeader {...this.props} lastUpdateTime={this.state.lastestDatapoint && this.state.lastestDatapoint.measurements.length ? this.state.lastestDatapoint.measurements[0].timestamp : " - "} editName={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)} />
                {this.state.loading ? (
                    <Stack style={{ marginTop: "30px", marginBottom: "30px" }}>
                        <Progress isIndeterminate={true} color="#e6f6f2" />
                    </Stack>
                ) : (
                    <div>
                        {this.state.data && <div>
                            <StatGroup style={{ marginTop: "30px", marginBottom: "30px" }}>
                                {bigCardFields.map(x => {
                                    return <SensorReading key={x} value={this.getLatestReading()[x] == null ? "-" : localeNumber(getUnitHelper(x).value(this.getLatestReading()[x], this.getLatestReading()["temperature"]), getUnitHelper(x).decimals)}
                                        alertTriggered={this.isAlertTriggerd(x)}
                                        label={t(getUnitHelper(x).label)}
                                        unit={t(getUnitHelper(x).unit)}
                                        selected={this.state.graphKey === x}
                                        onClick={() => this.setGraphKey(x)} />
                                })}
                            </StatGroup>
                            <div style={{ marginBottom: "20px" }}>
                                <table width="100%">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <div style={graphLengthText}>
                                                    {t("last")} {getTimespan(this.state.from).k} {t(getTimespan(this.state.from).t)}
                                                </div>
                                                <div style={graphInfo}>
                                                    {t("selected")}: {t(getUnitHelper(this.state.graphKey).label)} {this.getSelectedUnit()}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <span style={detailedSubText}>{`${uppercaseFirst(t("zoom"))}`}</span>
                                                <IconButton ml="-8px" variant="ghost" onClick={() => this.zoomInfo()}>
                                                    <MdInfo size="16" color={ruuviTheme.colors.primaryLight} />
                                                </IconButton>
                                                <Button variant='link' color="primary" ml="10px" mr="24px" style={detailedSubText} onClick={() => this.export()}>{`${uppercaseFirst(t("export"))} CSV`}</Button>
                                                <DurationPicker value={this.state.from} onChange={v => this.updateFrom(v)} />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {!this.state.data || !this.state.data.measurements.length ? (
                                <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", margin: 100 }}>{t("no_data_in_range")}</center>
                            ) : (
                                <Box ml={-5} mr={-5}>
                                    <Graph key={`graphkey${this.state.graphRenderKey}`} dataKey={this.state.graphKey} dataName={t(getUnitHelper(this.state.graphKey).label)} data={this.getGraphData()} height={450} cursor={true} from={new Date().getTime() - this.state.from * 60 * 60 * 1000} />
                                </Box>
                            )}
                            <div style={{ height: "20px" }} />
                            <Accordion allowMultiple ml={{ base: -15, md: -35 }} mr={{ base: -15, md: -35 }} defaultIndex={this.openAccodrions} onChange={v => this.setOpenAccordion(v)}>
                                <AccordionItem onChange={v => console.log(v)}>
                                    <AccordionButton style={accordionButton} _hover={{}}>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("general")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel style={accordionPanel}>
                                        <List>
                                            <ListItem>
                                                <table style={accordionContent}>
                                                    <tbody>
                                                        <tr>
                                                            <td width="50%">
                                                                <div style={detailedTitle}>{t("sensor_name")}</div>
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
                                                            <td width="50%">
                                                                <div style={detailedTitle}>{t("owner")}</div>
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
                                                                    <td width="50%">
                                                                        <div style={detailedTitle}>{t("share")}</div>
                                                                    </td>
                                                                    <td style={detailedText}>
                                                                        {t(this.props.sensor.sharedTo.length ? "sensor_shared" : "share")}
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
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("alerts")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel style={accordionPanel}>
                                        <List style={accordionContent}>
                                            {["Temperature", "Humidity", "Pressure", "Movement"].map(x => {
                                                var alert = this.getAlert(x.toLowerCase())
                                                return <AlertItem key={x} alerts={this.state.alerts} alert={alert}
                                                    detailedTitle={detailedTitle}
                                                    detailedText={detailedText} detailedSubText={detailedSubText}
                                                    type={x} onChange={(a, prevEnabled) => this.updateAlert(a, prevEnabled)} />
                                            })}
                                        </List>
                                    </AccordionPanel>
                                </AccordionItem>
                                <AccordionItem hidden={this.isSharedSensor()}>
                                    <AccordionButton style={accordionButton} _hover={{}}>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("offset_correction")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel style={accordionPanel}>
                                        <List>
                                            {["Temperature", "Humidity", "Pressure"].map(x => {
                                                var uh = getUnitHelper(x.toLocaleLowerCase());
                                                var value = uh.value(this.state.data["offset" + x], true);
                                                var unit = uh.unit;
                                                if (x === "Humidity") {
                                                    // humidity offset is always %
                                                    value = this.state.data["offset" + x]
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
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {uppercaseFirst(t("more_info"))}
                                        </Box>
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
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("remove")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel style={accordionPanel}>
                                        <List>
                                            <ListItem>
                                                <table width="100%" style={accordionContent}>
                                                    <tbody>
                                                        <tr>
                                                            <td width="50%">
                                                                <div style={detailedTitle}>{t("remove_this_sensor")}</div>
                                                            </td>
                                                            <td style={detailedText}>
                                                                <Button onClick={() => this.remove()}>{t("remove")}</Button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </ListItem>
                                        </List>
                                    </AccordionPanel>
                                </AccordionItem>
                            </Accordion>
                        </div>}
                    </div>
                )}
                <EditNameDialog open={this.state.editName} onClose={() => this.editName(false)} sensor={this.props.sensor} updateSensor={this.props.updateSensor} />
                <ShareDialog open={this.state.showShare} onClose={() => this.share(false)} sensor={this.props.sensor} updateSensor={this.props.updateSensor} />
                {this.state.data && <OffsetDialog open={this.state.offsetDialog} onClose={() => this.setState({ ...this.state, offsetDialog: null })} sensor={this.props.sensor} offsets={{ "Humidity": this.state.data.offsetHumidity, "Pressure": this.state.data.offsetPressure, "Temperature": this.state.data.offsetTemperature }} lastReading={this.getLatestReading()} updateSensor={this.props.updateSensor} />}
            </Box>
        )
    }
}

export default withRouter(withTranslation()(Sensor));