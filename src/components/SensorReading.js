import React from "react";
import {
    Stat,
} from "@chakra-ui/react"
import { ruuviTheme } from "../themes";

const middle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "10px",
}

const labelStyle = {
    fontFamily: "mulish",
    fontSize: 14,
    fontWeight: 600,
}

const height = "120px"
export default function SensorReading(props) {
    return (
        <Stat style={{ margin: "5px", height: height, backgroundColor: props.alertTriggered ? ruuviTheme.colors.errorBackground : "rgba(230,246,242,0.5)", border: props.selected ? props.alertTriggered ? "2px solid " +ruuviTheme.colors.error : "2px solid rgba(1,174,144,0.3)" : "2px solid rgba(0,0,0,0)", borderRadius: "10px", cursor: "pointer" }} onClick={props.onClick}>
            <center style={{ height: height }}>
                <div style={middle}>
                    <div>
                        <div style={{ marginBottom: -10, marginTop: -10 }}>
                            <span className="main-stat">
                                {props.value}
                            </span>
                            <span className="main-stat-unit">
                                {props.unit}
                            </span>
                        </div>
                        <span style={labelStyle}>{props.label}</span>
                    </div>
                </div>
            </center>
        </Stat>
    )
}