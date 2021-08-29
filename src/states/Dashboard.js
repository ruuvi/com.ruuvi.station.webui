import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/SensorCard";
import Sensor from "./Sensor";
import { GridItem, Spinner, Box, SimpleGrid } from "@chakra-ui/react"

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
        new NetworkApi().user(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                this.setState({ ...this.state, sensors: d, loading: false })
                new NetworkApi().getAlerts(data => {
                    if (data.result === "success") {
                        console.log(data.data.sensors)
                        this.setState({ ...this.state, alerts: data.data.sensors })
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
    render() {
        return (
            <Box marginTop="36px" marginLeft={{ base: "10px", md: "50px" }} marginRight={{ base: "10px", md: "50px" }}>
                <SimpleGrid minChildWidth="310px" spacing="8px" alignItems="center">
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
                        />
                    ) : (
                        <>
                            {this.state.sensors.map(x => {
                                return <a href={"#/" + x.sensor} style={{ alignItems: "center" }}>
                                    <SensorCard sensor={x} alerts={this.state.alerts.find(y => y.sensor === x.sensor)} />
                                </a>
                            })}
                        </>
                    )}
                </SimpleGrid>
            </Box>
        )
    }
}

export default Dashboard;