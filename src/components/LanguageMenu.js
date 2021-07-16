import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
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
                <MenuButton disabled={false} as={Button} rightIcon={<MdArrowDropDown size={20} color="#77cdc2" style={{ margin: -4 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }}>
                    En
                </MenuButton>
                <MenuList>
                    {["En", "Fi", "Sv", "Ru", "Fr"].map(x => {
                        return <MenuItem style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }}>{x}</MenuItem>
                    })}
                </MenuList>
            </Menu>
        )
    }
}

export default LanguageMenu;