import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/SensorCard";
import Sensor from "./Sensor";
import { Spinner, Box, Link } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import DurationPicker from "../components/DurationPicker";
import Store from "../Store";
import SessionStore from "../SessionStore";
import notify from "../utils/notify";
import SettingsModal from "../components/SettingsModal";

const infoText = {
    fontFamily: "mulish",
    fontSize: 16,
}

class Dashboard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            sensors: [],
            alerts: [],
            from: 24 * 3,
        }
        var from = new Store().getDashboardFrom();
        if (from) {
            // apply new dashboard history length limit to old stored value
            if (from > 24 * 7) from = 24 * 7;
            this.state.from = from;
        }
    }
    getCurrentSensor() {
        let id = this.props.match.params.id;
        return this.state.sensors.find(x => x.sensor === id);
    }
    componentDidUpdate() {
        document.title = "Ruuvi Station"
    }
    componentWillUnmount() {
        clearTimeout(this.alertUpdateLoop);
    }
    loadAlerts() {
        clearTimeout(this.alertUpdateLoop);
        this.alertUpdateLoop = setTimeout(() => {
            this.loadAlerts()
        }, 60 * 1000);
        // dont load alerts if sensor view is open
        if (this.getCurrentSensor()) return
        new NetworkApi().getAlerts(data => {
            if (data.result === "success") {
                this.setState({ ...this.state, alerts: data.data.sensors })
            }
        })
    }
    updateFrom(v) {
        this.setState({ ...this.state, from: v })
        new Store().setDashboardFrom(v)
    }
    componentDidMount() {
        var api = new NetworkApi();
        api.sensors(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                api.user(uresp => {
                    if (resp.result === "success") {
                        for (var i = 0; i < d.length; i++) {
                            let mac = d[i].sensor;
                            var uSensor = uresp.data.sensors.find(x => x.sensor === mac)
                            if (uSensor) d[i] = { ...d[i], ...uSensor }
                        }
                        this.setState({ ...this.state, sensors: d, loading: false })
                        this.loadAlerts();
                    } else if (resp.result === "error") {
                        notify.error(this.props.t(`UserApiError.${resp.code}`))
                    }
                })
            } else if (resp.result === "error") {
                notify.error(this.props.t(`UserApiError.${resp.code}`))
            }
        }, (e) => {
            notify.error(this.props.t(`something_went_wrong`))
        })
    }
    nextIndex(direction) {
        var current = this.getCurrentSensor().sensor;
        var setNext = current;
        var indexOfCurrent = this.state.sensors.findIndex(x => x.sensor === current)
        if (indexOfCurrent === -1) return;
        if (direction === 1 && indexOfCurrent === this.state.sensors.length - 1) setNext = this.state.sensors[0].sensor
        else if (direction === -1 && indexOfCurrent === 0) setNext = this.state.sensors[this.state.sensors.length - 1].sensor
        else setNext = this.state.sensors[indexOfCurrent + direction].sensor
        this.props.history.push('/' + setNext)
    }
    removeSensor() {
        var current = this.getCurrentSensor().sensor;
        this.setState({ ...this.state, sensors: this.state.sensors.filter(x => x.sensor !== current) })
        this.props.history.push('/')
    }
    updateSensor(sensor) {
        var idx = this.state.sensors.findIndex(x => x.sensor.sensor === sensor.sensor)
        if (idx > -1) {
            var sensors = this.state.sensors;
            sensors[idx] = sensor
            this.setState({ ...this.state, sensors: sensors })
        }
    }
    addRuuviLink(text) {
        var splitted = text.split("ruuvi.com")
        if (splitted.length === 1) return text;
        var out = [<span>{splitted[0]}</span>]
        for (var i = 1; i < splitted.length; i++) {
            out.push(<Link href="https://ruuvi.com" isExternal color="primary">ruuvi.com</Link>)
            out.push(<span>{splitted[i]}</span>);
        }
        return out;
    }
    showSettings() {
        return this.props.location.search.indexOf("settings") !== -1;
    }
    closeSettings() {
        window.location.href = window.location.href.split("?")[0]
    }
    render() {
        if (this.props.match.params.id) SessionStore.setBackRoute(`/${this.props.match.params.id}`)
        else SessionStore.setBackRoute("/")
        return (
            <>
                {!this.getCurrentSensor() &&
                    <div style={{ textAlign: "end", marginTop: -10, marginBottom: -40 }} >
                        <DurationPicker value={this.state.from} onChange={v => this.updateFrom(v)} dashboard />
                    </div>
                }
                <Box marginTop="36px" marginLeft={{ base: "10px", md: "20px", lg: "50px" }} marginRight={{ base: "10px", md: "20px", lg: "50px" }}>
                    {this.state.loading &&
                        <center>
                            <Spinner size="xl" />
                        </center>
                    }
                    {!this.state.loading && !this.state.sensors.length &&
                        <center style={{ margin: 32, ...infoText }}>
                            {this.props.t("dashboard_no_sensors").split("\\n").map((x, i) => <div key={i}>{this.addRuuviLink(x)}<br /></div>)}
                        </center>
                    }
                    {this.getCurrentSensor() ? (
                        <Sensor sensor={this.getCurrentSensor()}
                            close={() => this.props.history.push('/')}
                            next={() => this.nextIndex(1)}
                            prev={() => this.nextIndex(-1)}
                            remove={() => this.removeSensor()}
                            setAlerts={alerts => this.setState({ ...this.state, alerts: alerts })}
                            updateSensor={(sensor) => this.updateSensor(sensor)}
                        />
                    ) : (
                        <Box justifyContent={{ base: "space-evenly", lg: this.state.sensors.length > 2 ? "space-evenly" : "start" }} style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
                            <>
                                {this.state.sensors.map(x => {
                                    return <span key={x.sensor + this.state.from} style={{ margin: 16, minWidth: "350px", maxWidth: "450px", flexGrow: 2, flex: "1 1 0px" }}>
                                        <a href={"#/" + x.sensor}>
                                            <SensorCard sensor={x} alerts={this.state.alerts.find(y => y.sensor === x.sensor)} dataFrom={this.state.from} />
                                        </a></span>
                                })}
                            </>
                        </Box>
                    )}
                </Box>
                <SettingsModal open={this.showSettings()} onClose={() => this.closeSettings()} />
            </>
        )
    }
}

export default withTranslation()(Dashboard);