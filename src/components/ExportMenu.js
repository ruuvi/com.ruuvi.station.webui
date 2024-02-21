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
                <MenuItem style={{ ...detailedSubText }} onClick={() => props.onClick("XLSX")}>XLSX</MenuItem>
                <MenuDivider />
                <MenuItem isDisabled={!props.enablePDF} style={{ ...detailedSubText, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => props.onClick("PDF")}>PDF {props.enablePDF ? "" : "(Business Starter Plan)"}</MenuItem>
            </MenuList>
        </Menu>
    )
}