import React from "react";
import {
    Stat,
} from "@chakra-ui/react"

const middle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
}

const labelStyle = {
    fontFamily: "mulish",
    fontSize: 14,
    fontWeight: 600,
}

export default function SensorReading(props) {
    return (
        <Stat style={{ margin: "15px", height: "100px", backgroundColor: "#e6f6f2", border: props.selected ? "1px solid rgba(1,174,144,0.7)" : "1px solid rgba(1,174,144,0)", borderRadius: "10px" }} onClick={props.onClick}>
            <center style={{ height: 100 }}>
                <div style={middle}>
                    <div>
                        <div style={{ marginBottom: -10, marginTop: -10}}>
                            <span class="main-stat">
                                {props.value}
                            </span>
                            <span class="main-stat-unit">
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