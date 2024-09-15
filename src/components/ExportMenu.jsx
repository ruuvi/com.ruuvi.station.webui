import React from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

export default function ExportMenu(props) {
    let bottomStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
    return (
        <Menu autoSelect={false}>
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                borderRadius='4px'>
                {props.buttonText}
            </MenuButton>
            <MenuList>
                <MenuItem style={{ ...detailedSubText, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} onClick={() => props.onClick("CSV")}>CSV</MenuItem>
                <MenuDivider />
                <MenuItem style={{ ...detailedSubText, ...(props.noPdf ? bottomStyle : {}) }} onClick={() => props.onClick("XLSX")}>XLSX</MenuItem>
                {!props.noPdf && <>
                    <MenuDivider />
                    <MenuItem isDisabled={!props.enablePDF} style={{ ...detailedSubText, ...bottomStyle }} onClick={() => props.onClick("PDF")}>PDF {props.enablePDF ? "" : "(Business Starter Plan)"}</MenuItem>
                </>}
            </MenuList>
        </Menu>
    )
}