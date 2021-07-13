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

class LanguageMenu extends Component {
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
                <MenuButton disabled={true} as={Button} rightIcon={<ChevronDownIcon />} style={{ backgroundColor: "transparent" }}>
                    En
                </MenuButton>
                <MenuList>
                    <MenuItem>En</MenuItem>
                    <MenuItem>Fi</MenuItem>
                    <MenuItem>Sv</MenuItem>
                    <MenuItem>Ru</MenuItem>
                    <MenuItem>Fr</MenuItem>
                </MenuList>
            </Menu>
        )
    }
}

export default LanguageMenu;