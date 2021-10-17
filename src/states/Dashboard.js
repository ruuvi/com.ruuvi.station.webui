import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/SensorCard";
import Sensor from "./Sensor";
import { Spinner, Box } from "@chakra-ui/react"

class Dashboard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            sensors: [],
            alerts: [],
        }
    }
    getCurrentSensor() {
        let id = this.props.match.params.id;
        return this.state.sensors.find(x => x.sensor === id);
    }
    componentDidUpdate() {
        document.title = "Ruuvi Station"
    }
    componentDidMount() {
        var api = new NetworkApi();
        api.sensors(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                api.user(uresp => {
                    if (resp.result === "success") {
                        for (var i = 0; i < d.length; i++) {
                            var mac = d[i].sensor;
                            var uSensor = uresp.data.sensors.find(x => x.sensor === mac)
                            if (uSensor) d[i] = { ...d[i], ...uSensor }
                        }
                        this.setState({ ...this.state, sensors: d, loading: false })
                        api.getAlerts(data => {
                            if (data.result === "success") {
                                this.setState({ ...this.state, alerts: data.data.sensors })
                            }
                        })
                    } else if (resp.result === "error") {
                        alert(resp.error)
                    }
                })
            } else if (resp.result === "error") {
                alert(resp.error)
                //new NetworkApi().removeToken()
            }
        }, (e) => {
            alert("Network error")
            console.log("err", e)
            //new NetworkApi().removeToken()
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
    render() {
        return (
            <Box marginTop="36px" marginLeft={{ base: "10px", md: "20px", lg: "50px" }} marginRight={{ base: "10px", md: "20px", lg: "50px" }}>
                {this.state.loading &&
                    <center>
                        <Spinner size="xl" />
                    </center>
                }
                {this.getCurrentSensor() ? (
                    <Sensor sensor={this.getCurrentSensor()}
                        close={() => this.props.history.push('/')}
                        next={() => this.nextIndex(1)}
                        prev={() => this.nextIndex(-1)}
                        remove={() => this.removeSensor()}
                        updateSensor={(sensor) => this.updateSensor(sensor)}
                    />
                ) : (
                    
                    <Box justifyContent={{ base: "space-evenly", lg: this.state.sensors.length > 2 ? "space-evenly" : "start" }} style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
                    <>
                        {this.state.sensors.map(x => {
                            return <span style={{ margin: 16, minWidth: "350px", maxWidth: "450px", flexGrow: 2, flex: "1 1 0px" }}>
                                <a key={x.sensor} href={"#/" + x.sensor}>
                                    <SensorCard sensor={x} alerts={this.state.alerts.find(y => y.sensor === x.sensor)} />
                                </a></span>
                        })}
                    </>
                </Box>
                )}
            </Box>
        )
    }
}

export default Dashboard;