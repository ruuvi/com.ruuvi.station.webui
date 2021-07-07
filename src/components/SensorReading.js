import React from "react";
import {
    Stat,
} from "@chakra-ui/react"

export default function SensorReading(props) {
    return (
        <Stat style={{ margin: "15px", padding: "20px", height: "100px", backgroundColor: "#e6f6f2", border: props.selected ? "1px solid rgba(1,174,144,0.7)" : "", borderRadius: "10px" }} onClick={props.onClick}>
            <center>
                <span style={{ fontSize: "30px", fontWeight: "bold" }}>{props.value}</span> {props.unit}
                <br />
                {props.label}
            </center>
        </Stat>
    )
}