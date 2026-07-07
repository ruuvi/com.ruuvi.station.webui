import React, { useState } from "react";
import {
    Button,
    Input,
    SimpleGrid,
    FormControl,
    FormLabel,
} from "@chakra-ui/react"
import { useTranslation } from "react-i18next";
import RDialog from "./RDialog";

function RangeInputDialog(props) {
    const { t } = useTranslation();
    const [value, setValue] = useState(props.value || [props.range.min, props.range.max]);

    const update = () => {
        let v = [...value];
        if (props.number) {
            for (let i = 0; i < v.length; i++) {
                v[i] = parseFloat(v[i]);
                if (isNaN(v[i])) {
                    props.onClose(false)
                    return
                }
            }
        }
        props.onClose(true, v)
    }

    const isValid = (index) => {
        let v = [...value];
        if (index === undefined) {
            for (let i = 0; i < v.length; i++) {
                v[i] = parseFloat(v[i]);
                if (isNaN(v[i])) {
                    return false
                }
            }
            if (v[0] > v[1]) return false
            if (props.allowOutOfRange) return true
            if (v[0] < props.range.min) return false
            if (v[1] > props.range.max) return false
            return true;
        } else {
            v[index] = parseFloat(v[index]);
            if (isNaN(v[index])) {
                return false
            }
            if (v[0] > v[1]) return false
            if (props.allowOutOfRange) return true
            if (index === 0 && v[index] < props.range.min) return false
            if (index === 1 && v[index] > props.range.max) return false
            return true;
        }
    }

    const keyDown = (e) => {
        if (e.key === 'Enter') {
            if (!isValid()) return
            update();
        }
    }

    const unit = props.unit();
    return (
        <RDialog title={props.title} isOpen={props.open} onClose={() => props.onClose(false)}>
            <FormControl>
                <SimpleGrid columns={2} spacing={4}>
                    <span>
                        <FormLabel>{t("min") + (unit ? ` (${props.range.min} ${unit})` : "")}</FormLabel>
                        <Input autoFocus value={value[0]} type={"number"} onChange={e => setValue([e.target.value, value[1]])} onKeyDown={keyDown} isInvalid={!isValid(0)} />
                    </span>
                    <span>
                        <FormLabel>{t("max") + (unit ? ` (${props.range.max} ${unit})` : "")}</FormLabel>
                        <Input value={value[1]} type={"number"} onChange={e => setValue([value[0], e.target.value])} onKeyDown={keyDown} isInvalid={!isValid(1)} />
                    </span>
                </SimpleGrid>
            </FormControl>
            <div style={{ textAlign: "right" }}>
                <Button onClick={update} mt="17px" isDisabled={!isValid()}>{props.buttonText}</Button>
            </div>
        </RDialog>
    )
}

export default RangeInputDialog;
