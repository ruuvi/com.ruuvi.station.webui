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
import { withTranslation } from 'react-i18next';

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
    langChange = (lng) => {
        this.props.i18n.changeLanguage(lng);
    }
    uppercaseFirst = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    render() {
        const { t, i18n } = this.props;
        return (
            <Menu>
                <MenuButton disabled={false} as={Button} rightIcon={<MdArrowDropDown size={20} color="#77cdc2" style={{ margin: -4 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }}>
                    {this.uppercaseFirst(i18n.language || "en")}
                </MenuButton>
                <MenuList>
                    {["en", "fi", "sv"].map(x => {
                        return <MenuItem key={x} style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => this.langChange(x)}>{this.uppercaseFirst(x)}</MenuItem>
                    })}
                </MenuList>
            </Menu>
        )
    }
}

export default withTranslation()(LanguageMenu);