import React from "react";
import {
    IconButton,
    Stat,
    useColorMode,
} from "@chakra-ui/react"
import { ruuviTheme } from "../themes";
import BigValue from "./BigValue";
import { MdInfo } from "react-icons/md";
import notify from "../utils/notify";
import { useTranslation } from "react-i18next";
import { addNewlines } from "../TextHelper";
import { getDisplayValue } from "../UnitHelper";

const height = 120

const middle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    height: height - 10,
}

const labelStyle = {
    fontFamily: "mulish",
    fontSize: 14,
    fontWeight: 600,
    fontStyle: "italic",
    marginTop: -5,
    textAlign: "center"
}

const infoLabel = {
    position: "absolute",
    bottom: 8,
}

function info(e, t, sensorType) {
    e.stopPropagation();
    let text = t(`${sensorType}_info`)
    text = addNewlines(text)
    notify.info(text)
}

export default function SensorReading(props) {
    let mode = useColorMode().colorMode;
    const { t } = useTranslation();
    let width = 400

    let val = props.value;
    val = getDisplayValue(props.label, val)
    return (
        <Stat className="sensorValueBox" style={{ width, maxWidth: "100%", height: height, backgroundColor: props.alertTriggered ? ruuviTheme.colors.errorBackground : undefined, border: props.selected ? props.alertTriggered ? "2px solid " + ruuviTheme.colors.error : "2px solid " + ruuviTheme.newColors.sensorValueBoxActiveBorder[mode] : "2px solid rgba(0,0,0,0)", borderRadius: "10px", cursor: "pointer" }} onClick={props.onClick}>
            <IconButton style={{ position: "absolute", right: 0, margin: -8 }} variant="ghost" onClick={e => info(e, t, props.label)}>
                <MdInfo className="buttonSideIcon" size="16" />
            </IconButton>
            <div style={middle}>
                <BigValue
                    value={val}
                    unit={props.unit}
                />
                <span style={labelStyle}>{t(props.label)}</span>
                {props.info && <span style={{ ...labelStyle, ...infoLabel }}>({t(props.info)})</span>}
            </div>
        </Stat >
    )
}