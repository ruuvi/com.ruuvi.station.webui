import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
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
                <MenuButton as={Button} variant="topbar" rightIcon={<MdArrowDropDown className="buttonSideIcon" size={26} style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: "8px" }}>
                    <FaUserAlt />
                </MenuButton>
                <MenuList mt="2">
                    <MenuItem isDisabled={true} style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800, cursor: "unset", borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>{this.props.email}</MenuItem>
                    <MenuDivider />
                    {/**
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800 }} onClick={() => this.seeSettings()}>Show settings</MenuItem>
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800 }} onClick={() => this.seeAlerts()}>Show alerts</MenuItem>
                    */}
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800 }} onClick={() => this.settings()}>{t("settings")}</MenuItem>
                    <MenuDivider />
                    <MenuItem style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => this.props.logout()}>{t("sign_out")}</MenuItem>
                </MenuList>
            </Menu>
        )
    }
}

export default withTranslation()(UserMenu);