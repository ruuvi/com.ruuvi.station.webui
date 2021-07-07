import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
} from "@chakra-ui/react"
import { ChevronDownIcon } from "@chakra-ui/icons";
import NetworkApi from "../NetworkApi";
import { withRouter } from 'react-router-dom'

class SensorMenu extends Component {
    constructor(props) {
        super(props)
        this.state = {sensors: []}
        new NetworkApi().user(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                this.setState({ ...this.state, sensors: d,})
            } else if (resp.result === "error") {
                console.log("sensor menu error", resp.error)
            }
        });
    }
    render() {
        return (
            <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />} style={{ backgroundColor: "transparent" }}>
                    Sensors
                </MenuButton>
                <MenuList>
                    {this.state.sensors.map(x => {
                        return <MenuItem onClick={() => this.props.history.push('/' + x.sensor)}>{x.name || x.sensor}</MenuItem>
                    })}
                </MenuList>
            </Menu>
        )
    }
}

export default withRouter(SensorMenu);