import React, { useState } from "react";
import {
    Button,
    Input,
    SimpleGrid,
    Field,
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

    // manual input accepts (and labels show) the extended range when one exists;
    // range.min/max stay the standard range and only seed the default values
    const acceptedMin = props.range.extended ? props.range.extended.min : props.range.min;
    const acceptedMax = props.range.extended ? props.range.extended.max : props.range.max;

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
            if (v[0] < acceptedMin) return false
            if (v[1] > acceptedMax) return false
            return true;
        } else {
            v[index] = parseFloat(v[index]);
            if (isNaN(v[index])) {
                return false
            }
            if (v[0] > v[1]) return false
            if (props.allowOutOfRange) return true
            if (index === 0 && v[index] < acceptedMin) return false
            if (index === 1 && v[index] > acceptedMax) return false
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
            <SimpleGrid columns={2} gap={4}>
                <Field.Root invalid={!isValid(0)}>
                    <Field.Label>{t("min") + (unit ? ` (${acceptedMin} ${unit})` : "")}</Field.Label>
                    <Input autoFocus value={value[0]} type={"number"} onChange={e => setValue([e.target.value, value[1]])} onKeyDown={keyDown} />
                </Field.Root>
                <Field.Root invalid={!isValid(1)}>
                    <Field.Label>{t("max") + (unit ? ` (${acceptedMax} ${unit})` : "")}</Field.Label>
                    <Input value={value[1]} type={"number"} onChange={e => setValue([value[0], e.target.value])} onKeyDown={keyDown} />
                </Field.Root>
            </SimpleGrid>
            <div style={{ textAlign: "right" }}>
                <Button onClick={update} mt="17px" disabled={!isValid()}>{props.buttonText}</Button>
            </div>
        </RDialog>
    )
}

export default RangeInputDialog;
