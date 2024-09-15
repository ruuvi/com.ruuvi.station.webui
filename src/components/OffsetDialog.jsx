import React, { Component } from "react";
import {
    Button,
    ModalFooter,
    Box,
    Spinner,
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import { getUnitHelper, localeNumber } from "../UnitHelper";
import InputDialog from "./InputDialog";
import NetworkApi from "../NetworkApi";
import notify from "../utils/notify";
import RDialog from "./RDialog";


class OffsetDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { correctionInput: false, saving: false }
    }
    getLastReading() {
        if (!this.props.open) return "";
        var value = this.props.lastReading[this.props.open.toLowerCase()];
        if (this.props.open !== "Humidity")
            value = getUnitHelper(this.props.open.toLowerCase()).value(value);
        return value;
    }
    getOffset() {
        if (this.props.open === "Pressure") {
            return this.props.offsets[this.props.open] / 100
        }
        return this.props.offsets[this.props.open]
    }
    getUnit() {
        if (!this.props.open) return ""
        if (this.props.open === "Humidity") return "%"
        return getUnitHelper(this.props.open.toLowerCase()).unit
    }
    calibrate(value, save, clear) {
        if (save) {
            this.setState({ ...this.state, correctionInput: false, saving: true })
            if (!clear) {
                value = value - this.getLastReading() + this.getOffset()
                if (this.props.open === "Pressure")
                    value *= 100// (value * 100) - this.getLastReading() * 100 + this.getOffset() * 100
            }
            var data = {};
            var key = "offset" + this.props.open;
            data[key] = value;
            new NetworkApi().updateSensorData(this.props.sensor.sensor, data, resp => {
                switch (resp.result) {
                    case "success":
                        notify.success(this.props.t("successfully_saved"))
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000)
                        break
                    case "error":
                        notify.error(this.props.t(`UserApiError.${resp.code}`))
                        this.setState({ ...this.state, saving: false })
                        break;
                    default:
                }
            })
        } else {
            this.setState({ ...this.state, correctionInput: false })
        }
    }
    clearCalibration() {
        if (window.confirm(this.props.t("calibration_clear_confirm"))) {
            this.calibrate(0, true, true)
        }
    }
    format(number) {
        if (!this.props.open) return number;
        return localeNumber(number, getUnitHelper(this.props.open.toLowerCase()).decimals);
    }
    render() {
        var { t } = this.props;
        return (
            <>
                <RDialog title={t((this.props.open || "").toLowerCase() + "_offset")} isOpen={this.props.open} onClose={this.props.onClose}>
                    <Box mb="8">
                        {t("calibration_description").replace(t("calibration_description_link"), "").split("\\n").map((x, i) => <div key={i}>{x}<br /></div>)} <a style={{ color: "teal" }} href={t("calibration_description_link_url")}>{t("calibration_description_link")}</a>
                    </Box>
                    <div>
                        <b>{t("calibration_original_value")}</b>
                    </div>
                    {this.format(this.getLastReading() - this.getOffset())} {this.getUnit()}
                    {this.getOffset() !== 0 && <Box>
                        <hr />
                        <div>
                            <b>{t("calibration_corrected_value")}</b>
                        </div>
                        {this.format(this.getLastReading())} {this.getUnit()} {t("calibration_offset").replace("{%@^%1$s}", this.format(this.getOffset()) + " " + this.getUnit())}
                    </Box>
                    }
                    <ModalFooter display="flex" justifyContent="center">
                        {this.state.saving ? <Spinner /> : <>
                            <Button mr="2" onClick={() => this.setState({ ...this.state, correctionInput: true })}>{t("calibrate")}</Button>
                            {this.getOffset() !== 0 && <Button ml="2"  onClick={() => this.clearCalibration()}>{t("clear")}</Button>}
                        </>}
                    </ModalFooter>
                </RDialog>
                {
                    this.props.open && this.state.correctionInput && <InputDialog open={this.state.correctionInput} value={this.getLastReading()}
                        onClose={(save, value) => this.calibrate(value, save)}
                        title={t("calibration_setup")}
                        description={t(`calibration_enter_${this.props.open.toLowerCase()}`).replace("{%@^%1$s}", this.getUnit())}
                        number={true}
                        buttonText={t("ok")}
                    />
                }
            </>
        )
    }
}

export default withTranslation()(OffsetDialog);