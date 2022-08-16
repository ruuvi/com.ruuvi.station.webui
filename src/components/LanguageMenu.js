import React, { Component } from "react";
/*
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
*/
import { withTranslation } from 'react-i18next';
import { uppercaseFirst } from "../TextHelper";
import RadioInput from "./RadioInput";

class LanguageMenu extends Component {
    langChange = (lng) => {
        localStorage.setItem("selected_language", lng)
        this.props.i18n.changeLanguage(lng);
    }
    render() {
        const { i18n } = this.props;
        const langs = ["en", "fi", "sv"];
        const radioLangs = [{label: "language_english", value: "en"}, {label: "language_finnish", value: "fi"}, {label: "language_swedish", value: "sv"}];
        if (this.props.loginPage) {
            return (
                <>
                    {langs.map(x => {
                        return <span key={x} style={{ fontFamily: "mulish", margin: 6, fontWeight: "bold", cursor: "pointer", textDecoration: (i18n.language || "en") === x ? "underline" : "" }} onClick={() => this.langChange(x)}>{uppercaseFirst(x)}</span>
                    })}
                </>
            )
        }
        return (
            <RadioInput label={"language"} value={i18n.language || "en"} options={radioLangs} onChange={v => this.langChange(v)} />
        )
        /*
        return (
            <Menu autoSelect={false}>
                <MenuButton disabled={false} as={Button} variant="topbar" rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 15, paddingLeft: 0 }}>
                    {uppercaseFirst(i18n.language || "en")}
                </MenuButton>
                <MenuList mt="2">
                    {langs.map((x, i) => {
                        let borderStyle = {};
                        let divider = <></>
                        if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                        if (i === langs.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                        else divider = <MenuDivider />
                        return <>
                            <MenuItem key={x} className={i18n.language === x ? "menuActive" : undefined} style={{ fontFamily: "mulish", ...borderStyle }} onClick={() => this.langChange(x)}>{uppercaseFirst(x)}</MenuItem>
                            {divider}
                        </>
                    })}
                </MenuList>
            </Menu>
        )
        */
    }
}

export default withTranslation()(LanguageMenu);