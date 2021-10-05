import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    StatGroup,
    Heading,
    Stack,
    Button,
    IconButton,
    Box,
    Avatar,
    HStack,
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
import { CloseIcon, ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import { MdArrowDropDown, MdChevronRight } from "react-icons/md"
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";
import { withRouter } from 'react-router-dom';
import DurationText from "../components/DurationText";
import Store from "../Store";
import ShareDialog from "../components/ShareDialog";
import EditNameDialog from "../components/EditNameDialog";
import { uppercaseFirst } from "../TextHelper";
import AlertItem from "../components/AlertItem";

var timespans = [{ k: "1", t: "hour", v: 1 }, { k: "2", t: "hours", v: 2 }, { k: "8", t: "hours", v: 8 }, { k: "12", t: "hours", v: 12 }, { k: "1", t: "day", v: 24 }, { k: "2", t: "days", v: 24 * 2 }, { k: "1", t: "week", v: 24 * 7 }, { k: "2", t: "weeks", v: 24 * 7 * 2 }, { k: "1", t: "month", v: 24 * 7 * 4 }, { k: "2", t: "months", v: 24 * 7 * 4 * 2 }, { k: "3", t: "months", v: 24 * 7 * 4 * 3 }, { k: "6", t: "months", v: 24 * 7 * 4 * 6 }]

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
    marginLeft: 8,
    width: "calc(100% - 16px)",
}
const accordionButton = {
    paddingRight: 21,
}

function SensorHeader(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)")
    if (isLargeDisplay) {
        return <HStack alignItems="start">
            <Avatar bg="#01ae90" size="xl" name={props.sensor.name} src={props.sensor.picture} />
            <div style={{ width: "65%" }}>
                <Heading style={sensorName}>
                    {props.sensor.name}
                </Heading>
                <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }}>
                    <DurationText from={props.lastUpdateTime} t={props.t} />
                </div>
            </div>
            <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                {/*<IconButton isRound={true} onClick={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><EditIcon /></IconButton>*/}
                <IconButton isRound={true} onClick={() => props.prev()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "2px", marginRight: "5px" }}><ArrowBackIcon /></IconButton>
                <IconButton isRound={true} onClick={() => props.next()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><ArrowForwardIcon /></IconButton>
                <IconButton isRound={true} onClick={() => props.close()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><CloseIcon /></IconButton>
            </span>
        </HStack>
    } else {
        return <center>
            <Box m={2}>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td width="33%" style={{ verticalAlign: "top" }}>
                            <IconButton isRound={true} onClick={() => props.close()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><CloseIcon /></IconButton>
                        </td>
                        <td width="33%" align="center">
                            <Avatar bg="#01ae90" size="xl" name={props.sensor.name} src={props.sensor.picture} />
                        </td>
                        <td width="33%" align="right" style={{ verticalAlign: "top" }}>
                            <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                                {/*<IconButton isRound={true} onClick={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><EditIcon /></IconButton>*/}
                                <IconButton isRound={true} onClick={() => props.prev()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "2px", marginRight: "5px" }}><ArrowBackIcon /></IconButton>
                                <IconButton isRound={true} onClick={() => props.next()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><ArrowForwardIcon /></IconButton>
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
            loading: true,
            graphKey: "temperature",
            from: new Store().getGraphFrom() || 24,
            table: "",
            resolvedMode: "",
            mode: "mixed",
            alerts: [],
            editName: false,
            showShare: false,
        }
    }
    componentDidMount() {
        if (this.props.sensor) {
            this.loadData(true)
        }
    }
    componentDidUpdate(prevProps) {
        document.title = "Ruuvi Sensor: " + this.props.sensor.name
        if (this.props.sensor !== prevProps.sensor) {
            this.loadData(true)
        }
    }
    setMode(mode) {
        this.setState({ ...this.state, mode: mode }, () => {
            this.loadData(true);
        })
    }
    loadData(showLoading) {
        this.setState({ ...this.state, loading: showLoading !== undefined, ...(showLoading ? { data: null } : {}) })
        new NetworkApi().getAlerts(data => {
            if (data.result === "success") {
                var alerts = data.data.sensors.find(x => x.sensor === this.props.sensor.sensor)
                if (alerts) this.setState({ ...this.state, alerts: alerts.alerts })
            }
        })
        new NetworkApi().get(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.state.from), { mode: this.state.mode }, resp => {
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
    getLatestReading(kv) {
        if (!this.state.data || !this.state.data.measurements.length) return [];
        var ms = this.state.data.measurements;
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
        return alert.triggered;
    }
    remove() {
        var user = new NetworkApi().getUser().email
        var owner = this.props.sensor.owner
        var confirmText = this.props.t("remove_claimed_sensor")
        if (user !== owner) {
            confirmText = this.props.t("remove_shared_sensor")
        }
        var mac = this.props.sensor.sensor
        if (window.confirm(confirmText)) {
            new NetworkApi().unclaim(mac, resp => {
                if (resp.result === "success") {
                    this.props.remove();
                } else {
                    alert(resp.result)
                }
            }, fail => {
                alert(fail)
            })
        }
    }
    updateFrom(v) {
        this.setState({ ...this.state, from: v }, () => this.loadData(true))
        new Store().setGraphFrom(v)
    }
    share(state) {
        this.setState({ ...this.state, showShare: state })
    }
    editName(state) {
        this.setState({ ...this.state, editName: state })
    }
    updateAlert(alert) {
        var alerts = this.state.alerts;
        var alertIdx = alerts.find(x => x.sensor === alert.sensor && x.type === alert.type)
        if (alertIdx !== -1) {
            alerts[alertIdx] = alert
            this.setState({ ...this.state, alerts: alerts });
        }
        new NetworkApi().setAlert({ ...alert, sensor: this.props.sensor.sensor }, result => {
            console.log(result);
        })
    }
    render() {
        var { t } = this.props
        return (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" pt={{ base: "5px", md: "35px" }} pl={{ base: "5px", md: "35px" }} pr={{ base: "5px", md: "35px" }} style={{ backgroundColor: "white" }}>
                <SensorHeader {...this.props} lastUpdateTime={this.state.data ? this.state.data.latestTimestamp : " - "} editName={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)} />
                {this.state.loading ? (
                    <Stack style={{ marginTop: "30px" }}>
                        <Progress isIndeterminate={true} color="#e6f6f2" />
                    </Stack>
                ) : (
                    <div>
                        {this.state.data && <div>
                            <StatGroup style={{ marginTop: "30px", marginBottom: "30px" }}>
                                {bigCardFields.map(x => {
                                    return <SensorReading key={x} value={this.getLatestReading()[x] == null ? "-" : localeNumber(getUnitHelper(x).value(this.getLatestReading()[x]), getUnitHelper(x).decimals)}
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
                                                    {t("last")} {timespans.find(x => x.v === this.state.from).k} {t(timespans.find(x => x.v === this.state.from).t)}
                                                </div>
                                                <div style={graphInfo}>
                                                    {t(getUnitHelper(this.state.graphKey).label)} ({getUnitHelper(this.state.graphKey).unit})
                                    </div>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <Menu>
                                                    <MenuButton as={Button} rightIcon={<MdArrowDropDown size={20} color="#77cdc2" style={{ margin: -4 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 14 }}>
                                                        {timespans.find(x => x.v === this.state.from).k} {t(timespans.find(x => x.v === this.state.from).t)}
                                                    </MenuButton>
                                                    <MenuList>
                                                        {timespans.map(x => {
                                                            return <MenuItem key={x.v} style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => this.updateFrom(x.v)}>{x.k} {t(x.t)}</MenuItem>
                                                        })}
                                                    </MenuList>
                                                </Menu>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {!this.state.data || !this.state.data.measurements.length ? (
                                <center style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", margin: 100 }}>{t("no_data_in_range")}</center>
                            ) : (
                                <Box ml={-5} mr={-5}>
                                    <Graph dataKey={this.state.graphKey} dataName={t(getUnitHelper(this.state.graphKey).label)} data={this.state.data.measurements} height={450} cursor={true} from={new Date().getTime() - this.state.from * 60 * 60 * 1000} />
                                </Box>
                            )}
                            <div style={{ height: "20px" }} />
                            <Accordion allowMultiple ml={{ base: -15, md: -35 }} mr={{ base: -15, md: -35 }}>
                                <AccordionItem>
                                    <AccordionButton style={accordionButton}>
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
                                                                <span style={{ cursor: "pointer" }} onClick={() => this.editName(true)}>
                                                                    {this.props.sensor.name}
                                                                </span>
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
                                                    <ListItem>
                                                        <table style={accordionContent}>
                                                            <tbody>
                                                                <tr>
                                                                    <td width="50%">
                                                                        <div style={detailedTitle}>{t("share")}</div>
                                                                    </td>
                                                                    <td style={detailedText}>
                                                                        {t(this.props.sensor.sharedTo.length ? "sensor_shared" : "share")}
                                                                        <IconButton variant="ghost" icon={<MdChevronRight />} onClick={() => this.share(true)} />
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
                                    <AccordionButton style={accordionButton}>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("alerts")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel style={accordionPanel}>
                                        <List>
                                            {["Temperature", "Humidity", "Pressure", "Movement"].map(x => {
                                                var alert = this.getAlert(x.toLowerCase())
                                                return <AlertItem key={x} alerts={this.state.alerts} alert={alert}
                                                    accordionContent={accordionContent} detailedTitle={detailedTitle}
                                                    detailedText={detailedText} detailedSubText={detailedSubText}
                                                    type={x} onChange={a => this.updateAlert(a)} />
                                            })}
                                        </List>
                                    </AccordionPanel>
                                </AccordionItem>
                                <AccordionItem>
                                    <AccordionButton style={accordionButton}>
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
                                                return <ListItem key={x}>
                                                    <table style={accordionContent}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={detailedTitle}> {t(x.toLocaleLowerCase())}</td>
                                                                <td style={detailedText}>
                                                                    {localeNumber(value, uh.decimals)} {uh.unit}
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
                                    <AccordionButton style={accordionButton}>
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
                                    <AccordionButton style={accordionButton}>
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
                                                                <Button backgroundColor="#43c7ba" color="white" borderRadius="24" onClick={() => this.remove()}>{t("remove")}</Button>
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
            </Box>
        )
    }
}

export default withRouter(withTranslation()(Sensor));