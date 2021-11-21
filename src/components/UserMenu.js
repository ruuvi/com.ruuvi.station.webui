import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
} from "@chakra-ui/react"
import { FaUserAlt } from "react-icons/fa"
import { MdArrowDropDown } from "react-icons/md"
import NetworkApi from "../NetworkApi";
import { withTranslation } from 'react-i18next';
import { ruuviTheme } from "../themes";

class UserMenu extends Component {
    seeSettings = () => {
        new NetworkApi().getSettings(settings => {
            alert(JSON.stringify(settings))
        })
    }
    seeAlerts = () => {
        new NetworkApi().getAlerts(alerts => {
            alert(JSON.stringify(alerts))
        })
    }
    render() {
        var { t } = this.props
        return (
            <Menu autoSelect={false}>
                <MenuButton as={Button} rightIcon={<MdArrowDropDown size={20} color="#77cdc2" style={{ margin: -4 }} />} style={{ backgroundColor: "transparent", paddingRight: 0 }}>
                    <FaUserAlt />
                </MenuButton>
                <MenuList>
                    <MenuItem isDisabled={true} style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold", cursor:"unset" }}>{this.props.email}</MenuItem>
                    {/**
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => this.seeSettings()}>Show settings</MenuItem>
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => this.seeAlerts()}>Show alerts</MenuItem>
                    */}
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} _hover={{ bg: "#edfbf7" }} onClick={() => this.props.logout()}>{t("sign_out")}</MenuItem>
                </MenuList>
            </Menu>
        )
    }
}

export default withTranslation()(UserMenu);