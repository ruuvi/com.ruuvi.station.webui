import React, { useState } from "react";
import {
    Button,
    ModalFooter,
    Box,
    Spinner,
} from "@chakra-ui/react"
import { useTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../../UnitHelper";
import InputDialog from "./InputDialog";
import NetworkApi from "../../NetworkApi";
import notify from "../../utils/notify";
import RDialog from "./RDialog";


function OffsetDialog(props) {
    const { t } = useTranslation();
    const [correctionInput, setCorrectionInput] = useState(false);
    const [saving, setSaving] = useState(false);

    const getLastReading = () => {
        if (!props.open) return "";
        var value = props.lastReading[props.open.toLowerCase()];
        if (props.open !== "Humidity")
            value = getUnitHelper(props.open.toLowerCase()).value(value);
        return value;
    }

    const getOffset = () => {
        if (props.open === "Pressure") {
            return props.offsets[props.open] / 100
        }
        return props.offsets[props.open]
    }

    const getUnit = () => {
        if (!props.open) return ""
        if (props.open === "Humidity") return "%"
        return getUnitHelper(props.open.toLowerCase()).unit
    }

    const calibrate = (value, save, clear) => {
        if (save) {
            setCorrectionInput(false)
            setSaving(true)
            if (!clear) {
                value = value - getLastReading() + getOffset()
                if (props.open === "Pressure")
                    value *= 100
            }
            var data = {};
            var key = "offset" + props.open;
            data[key] = value;
            new NetworkApi().updateSensorData(props.sensor.sensor, data, resp => {
                switch (resp.result) {
                    case "success":
                        notify.success(t("successfully_saved"))
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000)
                        break
                    case "error":
                        notify.error(t(`UserApiError.${resp.code}`))
                        setSaving(false)
                        break;
                    default:
                }
            })
        } else {
            setCorrectionInput(false)
        }
    }

    const clearCalibration = () => {
        if (window.confirm(t("calibration_clear_confirm"))) {
            calibrate(0, true, true)
        }
    }

    const format = (number) => {
        if (!props.open) return number;
        return localeNumber(number, getUnitHelper(props.open.toLowerCase()).decimals);
    }

    return (
        <>
            <RDialog title={t((props.open || "").toLowerCase() + "_offset")} isOpen={props.open} onClose={props.onClose}>
                <Box mb="8">
                    {t("calibration_description").replace(t("calibration_description_link"), "").split("\\n").map((x, i) => <div key={i}>{x}<br /></div>)} <a style={{ color: "teal" }} href={t("calibration_description_link_url")}>{t("calibration_description_link")}</a>
                </Box>
                <div>
                    <b>{t("calibration_original_value")}</b>
                </div>
                {format(getLastReading() - getOffset())} {getUnit()}
                {getOffset() !== 0 && <Box>
                    <hr />
                    <div>
                        <b>{t("calibration_corrected_value")}</b>
                    </div>
                    {format(getLastReading())} {getUnit()} {t("calibration_offset").replace("{%@^%1$s}", format(getOffset()) + " " + getUnit())}
                </Box>
                }
                <ModalFooter display="flex" justifyContent="center">
                    {saving ? <Spinner /> : <>
                        <Button mr="2" onClick={() => setCorrectionInput(true)}>{t("calibrate")}</Button>
                        {getOffset() !== 0 && <Button ml="2" onClick={() => clearCalibration()}>{t("clear")}</Button>}
                    </>}
                </ModalFooter>
            </RDialog>
            {
                props.open && correctionInput && <InputDialog open={correctionInput} value={getLastReading()}
                    onClose={(save, value) => calibrate(value, save)}
                    title={t("calibration_setup")}
                    description={t(`calibration_enter_${props.open.toLowerCase()}`).replace("{%@^%1$s}", getUnit())}
                    number={true}
                    buttonText={t("ok")}
                />
            }
        </>
    )
}

export default OffsetDialog;
