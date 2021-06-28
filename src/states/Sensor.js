import React, { Component } from "react";
import NetworkApi from '../NetworkApi'
import {
    Stat,
    StatLabel,
    StatNumber,
    StatGroup,
    Skeleton,
    Heading,
    Stack,
    Button,
    RadioGroup,
    Radio,
    Input,
    IconButton,
    Box,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "../components/Graph";
import parse from "../decoder/parser";
import { EditIcon, CloseIcon, ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";

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
    getLatestReading() {
        if (!this.state.data || !this.state.data.measurements.length) return [];
        var ms = this.state.data.measurements;
        if (!ms || !ms.length) return [];
        ms = ms[0].parsed;
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
    render() {
        return (
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" padding="4px">
                <Heading>
                    {this.props.sensor.name || this.props.sensor.sensor}
                    <IconButton onClick={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)}><EditIcon /></IconButton>
                    <IconButton onClick={() => this.props.prev()}><ArrowBackIcon /></IconButton>
                    <IconButton onClick={() => this.props.next()}><ArrowForwardIcon /></IconButton>
                    <IconButton onClick={() => this.props.close()}><CloseIcon /></IconButton>
                </Heading>
                {this.state.editName !== null && <div>
                    <Input value={this.state.editName} onChange={v => this.updateStateVar("editName", v.target.value)} />
                    <Button onClick={() => this.update()}>Update</Button>
                </div>}
                {this.state.loading ? (
                    <Stack marginRight="12px">
                        <Skeleton height="20px" />
                        <Skeleton height="80px" />
                        <Skeleton height="80px" />
                        <Skeleton height="300px" />
                        <Skeleton height="40px" />
                    </Stack>
                ) : (
                    <div>
                        {this.state.data && <div>
                            {this.props.sensor.name && <div><b>{this.props.sensor.sensor}</b></div>}
                            <div>
                                Last update: {this.getTimeSinceLastUpdate()}m ago
                            </div>
                            <StatGroup>
                                {this.getLatestReading().map(x => {
                                    return (
                                        <Stat key={x.key} margin="12px" onClick={() => this.setState({ ...this.state, graphKey: x.key })}>
                                            <StatLabel>{x.key}</StatLabel>
                                            <StatNumber>{x.value}</StatNumber>
                                        </Stat>
                                    )
                                })}
                            </StatGroup>
                            <Graph dataKey={this.state.graphKey} data={this.state.data.measurements} cursor={true} />
                            <StatGroup>{[{ k: "2.9 hours", v: 2.9 }, { k: "3.1 hours", v: 3.1 }, { k: "8 hours", v: 8 }, { k: "12 hours", v: 12 }, { k: "1 day", v: 24 }, { k: "1 week", v: 24 * 7 }, { k: "2 weeks", v: 24 * 7 * 2 }, { k: "1 month", v: 24 * 7 * 4 }, { k: "2 months", v: 24 * 7 * 4 * 2 }, { k: "3 months", v: 24 * 7 * 4 * 3 }].map(x => {
                                return <Button key={x.v} colorScheme={x.v === this.state.from ? "teal" : undefined}
                                    onClick={() => { this.setState({ ...this.state, from: x.v }, () => this.loadData(true)); }}>{x.k}</Button>
                            })}</StatGroup>
                            <RadioGroup onChange={this.setMode.bind(this)} value={this.state.mode}>
                                <Stack direction="row">
                                    <Radio value="dense">Dense</Radio>
                                    <Radio value="mixed">Mixed</Radio>
                                    <Radio value="sparse">Sparse</Radio>
                                </Stack>
                            </RadioGroup>
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