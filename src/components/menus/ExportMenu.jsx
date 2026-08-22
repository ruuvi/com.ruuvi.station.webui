import React from "react";
import {
    Menu,
    Button,
    Portal,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

export default function ExportMenu(props) {
    let bottomStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
    return (
        <Menu.Root>
            <Menu.Trigger asChild>
                <Button
                    variant="ddl"
                    className="durationPicker"
                    style={{ ...detailedSubText }}
                    borderRadius='4px'>
                    {props.buttonText}
                    <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />
                </Button>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner>
                    <Menu.Content>
                        <Menu.Item value="CSV" style={{ ...detailedSubText, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} onClick={() => props.onClick("CSV")}>CSV</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="XLSX" style={{ ...detailedSubText, ...(props.noPdf ? bottomStyle : {}) }} onClick={() => props.onClick("XLSX")}>XLSX</Menu.Item>
                        {!props.noPdf && <>
                            <Menu.Separator />
                            <Menu.Item value="PDF" disabled={!props.enablePDF} style={{ ...detailedSubText, ...bottomStyle }} onClick={() => props.onClick("PDF")}>PDF {props.enablePDF ? "" : "(Business Starter Plan)"}</Menu.Item>
                        </>}
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    )
}
