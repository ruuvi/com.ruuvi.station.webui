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
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "../components/Graph";
import SensorReading from "../components/SensorReading";
import parse from "../decoder/parser";
import { EditIcon, CloseIcon, ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";

import { MdArrowDropDown } from "react-icons/md"

var unitHelper = {
    "temperature": { label: "Temperature", unit: "°C", value: (value) => value },
    "humidity": { label: "Humidity", unit: "%", value: (value) => value },
    "pressure": { label: "Pressure", unit: "hPa", value: (value) => value / 100 },
    "movementCounter": { label: "Movement", unit: "Times", value: (value) => value },
    "battery": { label: "Battery", unit: "V", value: (value) => value / 1000 },
}

function getUnitHelper(key) {
    if (unitHelper[key]) return unitHelper[key]
    return { label: "", unit: "", value: (value) => value }
}

var timespans = [{ k: "1 hours", v: 1 }, { k: "2 hours", v: 2 }, { k: "8 hours", v: 8 }, { k: "12 hours", v: 12 }, { k: "1 day", v: 24 }, { k: "2 days", v: 24 * 2 }, { k: "1 week", v: 24 * 7 }, { k: "2 weeks", v: 24 * 7 * 2 }, { k: "1 month", v: 24 * 7 * 4 }, { k: "2 months", v: 24 * 7 * 4 * 2 }, { k: "3 months", v: 24 * 7 * 4 * 3 }, { k: "6 months", v: 24 * 7 * 4 * 6 }]

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

const collapseText = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
}
const detailedTitle = {
    fontFamily: "mulish",
    fontSize: "16px",
    fontWeight: 800,
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
        if (this.props.sensor) {
            this.loadData(true)
            //this.updateInterval = setInterval(this.loadData.bind(this), 10 * 1000);
        }
    }
    componentWillUnmount() {
        //clearInterval(this.updateInterval);
    }
    componentDidUpdate(prevProps) {
        if (this.props.sensor !== prevProps.sensor) {
            this.loadData(true)
        }
    }
    setMode(mode) {
        console.log(mode)
        this.setState({ ...this.state, mode: mode }, () => {
            this.loadData(true);
        })
    }
    loadData(showLoading) {
        this.setState({ ...this.state, loading: showLoading !== undefined, ...(showLoading ? { data: null } : {}) })
        new NetworkApi().get(this.props.sensor.sensor, parseInt(((new Date().getTime()) / 1000) - 60 * 60 * this.state.from), this.state.mode, resp => {
            console.log("resp", resp)
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
        return Math.floor(((now - lastUpdate) / 60))
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
        console.log("key", key)
        this.setState({ ...this.state, graphKey: key });
    }
    render() {
        return (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" padding="15px" style={{ backgroundColor: "white" }}>
                <HStack>
                    <Avatar bg="#01ae90" size="xl" name={this.props.sensor.name || this.props.sensor.sensor} src={this.props.sensor.picture} />
                    <div style={{ width: "50%" }}>
                        <Heading style={sensorName}>
                            {this.props.sensor.name || this.props.sensor.sensor}
                        </Heading>
                        <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }}>
                            Last update: {this.getTimeSinceLastUpdate()}m ago
                        </div>
                    </div>
                    <span style={{ width: "100%", textAlign: "right", marginTop: "-50px" }}>
                        <IconButton isRound={true} onClick={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><EditIcon /></IconButton>
                        <IconButton isRound={true} onClick={() => this.props.prev()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><ArrowBackIcon /></IconButton>
                        <IconButton isRound={true} onClick={() => this.props.next()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginRight: "5px" }}><ArrowForwardIcon /></IconButton>
                        <IconButton isRound={true} onClick={() => this.props.close()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0" }}><CloseIcon /></IconButton>
                    </span>
                </HStack>
                {this.state.editName !== null && <div>
                    <Input value={this.state.editName} onChange={v => this.updateStateVar("editName", v.target.value)} />
                    <Button onClick={() => this.update()}>Update</Button>
                </div>}
                {this.state.loading ? (
                    <Stack style={{ marginTop: "30px" }}>
                        <Progress isIndeterminate={true} color="#e6f6f2" />
                    </Stack>
                ) : (
                    <div>
                        {this.state.data && <div>
                            <StatGroup style={{ marginTop: "30px", marginBottom: "30px" }}>
                                {["temperature", "humidity", "pressure", "movementCounter", "battery"].map(x => {
                                    return <SensorReading value={getUnitHelper(x).value(this.getLatestReading()[x])}
                                        label={getUnitHelper(x).label}
                                        unit={getUnitHelper(x).unit}
                                        selected={this.state.graphKey === x}
                                        onClick={() => this.setGraphKey(x)} />
                                })}
                            </StatGroup>
                            <table width="100%">
                                <td>
                                    <div style={{ ...collapseText, marginLeft: "30px" }}>
                                        Last {timespans.find(x => x.v === this.state.from).k}
                                    </div>
                                    <div style={graphInfo}>
                                        {getUnitHelper(this.state.graphKey).label} ({getUnitHelper(this.state.graphKey).unit})
                                    </div>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                    <Menu>
                                        <MenuButton as={Button} rightIcon={<MdArrowDropDown size={20} color="#77cdc2" style={{ margin: -4 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }}>
                                            {timespans.find(x => x.v === this.state.from).k}
                                        </MenuButton>
                                        <MenuList>
                                            {timespans.map(x => {
                                                return <MenuItem style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => this.setState({ ...this.state, from: x.v }, () => this.loadData(true))}>{x.k}</MenuItem>
                                            })}
                                        </MenuList>
                                    </Menu>
                                </td>
                            </table>


                            <Graph dataKey={this.state.graphKey} data={this.state.data.measurements} cursor={true} />
                            <Accordion allowMultiple style={{ marginLeft: -15, marginRight: -15 }}>
                                <AccordionItem>
                                    <AccordionButton>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            Alerts
                                            </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel pb={4} style={{ backgroundColor: "#f6fcfb" }}>
                                        <div style={{ marginTop: 16, marginBottom: 8 }}>
                                            <div style={{ detailedTitle }}>
                                                Not impelemeted
                                            </div>
                                        </div>
                                        <List>
                                            {["Temperature", "Humidity", "Pressure"].map(x => {
                                                return <ListItem>
                                                    <table width="100%" style={{ marginTop: 16, marginBottom: 16 }}>
                                                        <td>
                                                            <div style={detailedTitle}>{x}</div>
                                                            <div style={detailedSubText}>{x}</div>
                                                        </td>
                                                        <td style={detailedText}>
                                                            -
                                                        </td>
                                                    </table>
                                                    <hr />
                                                </ListItem>
                                            })}
                                        </List>
                                    </AccordionPanel>
                                </AccordionItem>

                                <AccordionItem>
                                    <AccordionButton>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            Offset Correction
                                            </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel pb={4} style={{ backgroundColor: "#f6fcfb" }}>
                                        <List>
                                            {["Temperature", "Humidity", "Pressure"].map(x => {
                                                return <ListItem>
                                                    <table width="100%" style={{ marginTop: 16, marginBottom: 16 }}>
                                                        <td style={detailedTitle}> {x}</td>
                                                        <td style={detailedText}>
                                                            {this.state.data["offset" + x]}
                                                        </td>
                                                    </table>
                                                    <hr />
                                                </ListItem>
                                            })}
                                        </List>
                                    </AccordionPanel>
                                </AccordionItem>

                                <AccordionItem>
                                    <AccordionButton>
                                        <Box flex="1" textAlign="left" style={collapseText}>
                                            Sensor Info
                                            </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                    <hr />
                                    <AccordionPanel pb={4} style={{ backgroundColor: "#f6fcfb" }}>
                                        <List>
                                            {this.getLatestReading(true).map(x => {
                                                return (
                                                    <ListItem>
                                                        <table width="100%" style={{ marginTop: 16, marginBottom: 16 }} onClick={() => this.setGraphKey(x.key)}>
                                                            <td style={detailedTitle}> {x.key}</td>
                                                            <td style={detailedText}>
                                                                {x.value}
                                                            </td>
                                                        </table>
                                                        <hr />
                                                    </ListItem>
                                                )
                                            })}
                                            <ListItem>
                                                <table width="100%" style={{ marginTop: 16, marginBottom: 16 }}>
                                                    <td width="50%">
                                                        <div style={detailedTitle}>Remove</div>
                                                        <div style={detailedSubText}>Remove this sensor</div>
                                                    </td>
                                                    <td style={detailedText}>
                                                        <Button backgroundColor="#43c7ba" color="white" borderRadius="24">Remove</Button>
                                                    </td>
                                                </table>
                                                <hr />
                                            </ListItem>
                                        </List>
                                    </AccordionPanel>
                                </AccordionItem>
                            </Accordion>

                            <div style={{ marginTop: "200px" }}>
                            </div>
                            table: <b>{this.state.table}</b>
                            <br />
                            resolvedMode: <b>{this.state.resolvedMode}</b>
                            <br />
                            {this.state.data.measurements.length} broadcasts
                        </div>}
                    </div>
                )}
            </Box>
        )
    }
}

export default Sensor;