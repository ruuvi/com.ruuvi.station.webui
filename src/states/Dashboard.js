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
        }
    }
    getCurrentSensor() {
        let id = this.props.match.params.id;
        return this.state.sensors.find(x => x.sensor === id);
    }
    componentDidMount() {
        new NetworkApi().user(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                this.setState({ ...this.state, sensors: d, loading: false })
            } else if (resp.result === "error") {
                alert(resp.error)
                // maybe dont be so quick to kick the user out?
                new NetworkApi().removeToken()
            }
        }, (e) => {
            alert("Network error")
            console.log("err", e)
            // maybe dont be so quick to kick the user out?
            new NetworkApi().removeToken()
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
    render() {
        return (
            <Box margin="36px">
                <SimpleGrid columns={{ sm: 1, md: 2, lg: 4 }} spacing="40px">
                    {this.state.loading &&
                        <GridItem colSpan={4}>
                            <center>
                                <Spinner size="xl" />
                            </center>
                        </GridItem>
                    }
                    {this.getCurrentSensor() ? (
                        <GridItem colSpan={12}>
                            <Sensor sensor={this.getCurrentSensor()} 
                            close={() => this.props.history.push('/')} 
                            next={() => this.nextIndex(1)} 
                            prev={() => this.nextIndex(-1)} 
                             />
                        </GridItem>
                    ) : (
                        <>
                            {this.state.sensors.map(x => {
                                return <GridItem>
                                    <a href={"#/"+x.sensor}>
                                    <SensorCard sensor={x} />
                                    </a>
                                </GridItem>
                            })}
                        </>
                    )}
                </SimpleGrid>
            </Box>
        )
    }
}

export default Dashboard;