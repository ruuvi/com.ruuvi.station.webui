import React, { useState } from "react";
import {
    Button,
    Input,
    Box,
} from "@chakra-ui/react"
import RDialog from "./RDialog";

function InputDialog(props) {
    const [value, setValue] = useState(props.value != null ? props.value : "");

    const getNumber = () => parseFloat(value);

    const update = () => {
        let v = value;
        if (props.number) {
            v = parseFloat(v);
            if (isNaN(v)) {
                props.onClose(false)
                return
            }
        }
        props.onClose(true, v)
    }

    const updateInput = (e) => {
        let v = e.target.value;
        if (props.maxLength) {
            v = v.substring(0, props.maxLength)
        }
        setValue(v)
    }

    const keyDown = (e) => {
        if (e.key === 'Enter') {
            if (props.number && isNaN(getNumber())) return
            update();
        }
    }

    return (
        <RDialog title={props.title} isOpen={props.open} onClose={() => props.onClose(false)}>
            {props.description && <Box mb="2">{props.description}</Box>}
            <Input autoFocus value={value} type={props.number ? "number" : ""} onChange={updateInput} onKeyDown={keyDown} />
            <div style={{ textAlign: "right" }}>
                <Button onClick={update} mt="17px" disabled={props.number && isNaN(getNumber())}>{props.buttonText}</Button>
            </div>
        </RDialog>
    )
}

export default InputDialog;
