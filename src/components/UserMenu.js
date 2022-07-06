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
import { withTranslation } from 'react-i18next';

class UserMenu extends Component {
    settings() {
        this.props.settings();
    }
    render() {
        var { t } = this.props
        return (
            <Menu autoSelect={false}>
                <MenuButton as={Button} variant="ddl" rightIcon={<MdArrowDropDown size={26} color="#77cdc2" style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", paddingRight: 0 }}>
                    <FaUserAlt />
                </MenuButton>
                <MenuList mt="2">
                    <MenuItem isDisabled={true} style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800, cursor: "unset" }}>{this.props.email}</MenuItem>
                    {/**
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800 }} onClick={() => this.seeSettings()}>Show settings</MenuItem>
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800 }} onClick={() => this.seeAlerts()}>Show alerts</MenuItem>
                    */}
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800 }} _hover={{ bg: "primaryLighter" }} onClick={() => this.settings()}>{t("settings")}</MenuItem>
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800 }} _hover={{ bg: "primaryLighter" }} onClick={() => this.props.logout()}>{t("sign_out")}</MenuItem>
                </MenuList>
            </Menu>
        )
    }
}

export default withTranslation()(UserMenu);