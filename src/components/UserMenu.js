import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
} from "@chakra-ui/react"
import { ChevronDownIcon } from "@chakra-ui/icons";
import { FaUserAlt } from "react-icons/fa"
import NetworkApi from "../NetworkApi";

class UserMenu extends Component {
    constructor(props) {
        super(props)
    }
    seeSettings = () => {
        new NetworkApi().getSettings(settings => {
            alert(JSON.stringify(settings, null, 2))
        })
    }
    seeAlerts = () => {
        new NetworkApi().getAlerts(alerts => {
            alert(JSON.stringify(alerts, null, 2))
        })
    }
    render() {
        return (
            <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />} style={{ backgroundColor: "transparent" }}>
                    <FaUserAlt />
                </MenuButton>
                <MenuList>
                    <MenuItem>{this.props.email}</MenuItem>
                    <MenuItem onClick={() => this.seeSettings()}>Show settings</MenuItem>
                    <MenuItem onClick={() => this.seeAlerts()}>Show alerts</MenuItem>
                    <MenuItem onClick={() => this.props.logout()}>Logout</MenuItem>
                </MenuList>
            </Menu>
        )
    }
}

export default UserMenu;