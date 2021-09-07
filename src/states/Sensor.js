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
    Input,
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
    Switch,
    useMediaQuery,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "../components/Graph";
import SensorReading from "../components/SensorReading";
import parse from "../decoder/parser";
import { CloseIcon, ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import { MdArrowDropDown } from "react-icons/md"
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber, temperatureOffsetToUserFormat, temperatureToUserFormat } from "../UnitHelper";
import { withRouter } from 'react-router-dom';
import DurationText from "../components/DurationText";

var uppercaseFirst = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

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
    cursor: 'pointer',
}

const sensorNameMobile = {
    fontFamily: "montserrat",
    fontSize: "34px",
    fontWeight: 800,
    cursor: 'pointer',
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
}
const accordionContent = {
    marginTop: 26,
    marginBottom: 26
}

function SensorHeader(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 600px)")
    if (isLargeDisplay) {
        return <HStack alignItems="start">
            <Avatar bg="#01ae90" size="xl" name={props.sensor.name} src={props.sensor.picture} />
            <div style={{ width: "65%" }}>
                <Heading style={sensorName} onClick={() => props.editName()}>
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
                <Heading style={sensorNameMobile} onClick={() => props.editName()}>
                    {props.sensor.name}
                </Heading>
                <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }}>
                    <DurationText from={props.lastUpdateTime} t={props.t} />
                </div>
            </div>
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
            from: 24,
            table: "",
            resolvedMode: "",
            mode: "mixed",
            editName: null,
            alerts: [],
        }
    }
    componentDidMount() {
        //this.interval = setInterval(() => this.forceUpdate(), 1000);
        if (this.props.sensor) {
            this.loadData(true)
            //this.updateInterval = setInterval(this.loadData.bind(this), 10 * 1000);
        }
    }
    componentWillUnmount() {
        //clearInterval(this.interval);
        //clearInterval(this.updateInterval);
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
    getLastUpdateTime() {
        if (!this.state.data || !this.state.data.measurements.length) return " - ";
        return this.state.data.measurements[0].timestamp
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
    getAlertText(type) {
        var idx = this.state.alerts.findIndex(x => x.type === type)
        if (idx !== -1) {
            if (type === "movement") {
                return this.props.t("alert_movement_description")
            }
            var min = this.state.alerts[idx].min
            var max = this.state.alerts[idx].max
            if (type === "temperature") {
                min = temperatureToUserFormat(min)
                max = temperatureToUserFormat(max)
            } else if (type === "pressure") {
                min /= 100;
                max /= 100;
            }
            min = localeNumber(min, 2)
            max = localeNumber(max, 2)
            let regx = "{(.*?)}"
            var alertText = this.props.t("alert_description")
            var match = alertText.match(regx)
            alertText = alertText.replace(match[0], min)
            match = alertText.match(regx)
            alertText = alertText.replace(match[0], max)
            return alertText;
        }
        return uppercaseFirst(type)
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
    render() {
        var { t } = this.props
        return (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" padding="35px" style={{ backgroundColor: "white" }}>
                <SensorHeader {...this.props} lastUpdateTime={this.getLastUpdateTime()} editName={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)} />
                {this.state.editName !== null && <div>
                    <Input value={this.state.editName} onChange={v => this.updateStateVar("editName", v.target.value)} />
                    <Button onClick={() => this.update()}>{t("update")}</Button>
                </div>}
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
                                                            return <MenuItem key={x.v} style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => this.setState({ ...this.state, from: x.v }, () => this.loadData(true))}>{x.k} {t(x.t)}</MenuItem>
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
                                <Graph dataKey={this.state.graphKey} dataName={t(getUnitHelper(this.state.graphKey).label)} data={this.state.data.measurements} height={450} cursor={true} from={new Date().getTime() - this.state.from * 60 * 60 * 1000} />
                            )}
                            <div style={{ height: "20px" }} />
                            <Accordion allowMultiple style={{ marginLeft: -35, marginRight: -35 }}>
                                <AccordionItem>
                                    <AccordionButton>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("alerts")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel pb={4} style={accordionPanel}>
                                        <div style={{ marginTop: 16, marginBottom: 8 }}>
                                            <div style={{ detailedTitle }}>
                                            </div>
                                        </div>
                                        <List>
                                            {["Temperature", "Humidity", "Pressure", "Movement"].map(x => {
                                                return <ListItem key={x} style={{ color: this.isAlertTriggerd(x) ? "#f27575" : undefined }}>
                                                    <table width="100%" style={accordionContent}>
                                                        <tbody>
                                                            <tr>
                                                                <td width="50%">
                                                                    <div style={detailedTitle}>{t(x.toLocaleLowerCase())}</div>
                                                                    <div style={detailedSubText}>{this.getAlert(x.toLocaleLowerCase()) && this.getAlert(x.toLocaleLowerCase()).enabled && <span>{this.getAlertText(x.toLocaleLowerCase())}</span>}</div>
                                                                </td>
                                                                <td style={detailedText}>
                                                                    <Switch isDisabled isChecked={this.getAlert(x.toLocaleLowerCase()) && this.getAlert(x.toLocaleLowerCase()).enabled} />
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    {x !== "Movement" && <hr />}
                                                </ListItem>
                                            })}
                                        </List>
                                    </AccordionPanel>
                                </AccordionItem>

                                <AccordionItem>
                                    <AccordionButton>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("offset_correction")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel pb={4} style={accordionPanel}>
                                        <List>
                                            {["Temperature", "Humidity", "Pressure"].map(x => {
                                                return <ListItem key={x}>
                                                    <table width="100%" style={accordionContent}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={detailedTitle}> {t(x.toLocaleLowerCase())}</td>
                                                                <td style={detailedText}>
                                                                    {x === "Pressure" ? (
                                                                        <>
                                                                            {localeNumber((this.state.data["offset" + x] / 100), 2)} {getUnitHelper(x.toLocaleLowerCase()).unit}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {localeNumber(temperatureOffsetToUserFormat(this.state.data["offset" + x]), 2)} {getUnitHelper(x.toLocaleLowerCase()).unit}
                                                                        </>
                                                                    )}
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
                                    <AccordionButton>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            {t("sensor_info")}
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel pb={4} style={accordionPanel}>
                                        <List>
                                            {sensorInfoOrder.map(order => {
                                                var x = this.getLatestReading(true).find(x => x.key === order);
                                                if (!x) return null
                                                let uh = getUnitHelper(x.key)
                                                return (
                                                    <ListItem key={x.key}>
                                                        <table width="100%" style={{ ...accordionContent, cursor: uh.graphable ? "pointer" : "" }} onClick={() => uh.graphable ? this.setGraphKey(x.key) : console.log("Not graphable")}>
                                                            <tbody>
                                                                <tr>
                                                                    <td style={detailedTitle}> {t(uh.label || x.key)}</td>
                                                                    <td style={{ ...detailedText, textDecoration: uh.graphable ? "underline" : "" }}>
                                                                        {localeNumber(uh.value(x.value), uh.decimals)} {uh.unit}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        <hr />
                                                    </ListItem>
                                                )
                                            })}
                                            <ListItem>
                                                <table width="100%" style={accordionContent}>
                                                    <tbody>
                                                        <tr>
                                                            <td width="50%">
                                                                <div style={detailedTitle}>{t("remove")}</div>
                                                                <div style={detailedSubText}>{t("remove_this_sensor")}</div>
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
            </Box>
        )
    }
}

export default withRouter(withTranslation()(Sensor));