import { Box, ListItem } from "@chakra-ui/layout";
import { Switch } from "@chakra-ui/switch";
import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import { uppercaseFirst } from "../TextHelper";
import { getAlertRange, localeNumber, temperatureToUserFormat } from "../UnitHelper";
import AlertSlider from "./AlertSlider";
import EditableText from "./EditableText";
import InputDialog from "./InputDialog";
import RangeInputDialog from "./RangeInputDialog";

const alertDescription = {
    fontFamily: "mulish",
    fontSize: 12,
    marginRight: 16,
    cursor: "pointer",
}

class AlertItem extends Component {
    constructor(props) {
        super(props)
        this.state = {
            alert: this.props.alert,
            editDescription: false,
            rangeInputDialog: false,
        }
    }
    getAlertText(alert, type) {
        if (alert) {
            if (type === "movement") {
                return this.props.t("alert_movement_description")
            }
            var min = alert.min
            var max = alert.max
            if (type === "temperature") {
                min = temperatureToUserFormat(min)
                max = temperatureToUserFormat(max)
            } else if (type === "pressure") {
                min /= 100;
                max /= 100;
            }
            min = localeNumber(min, 2)
            max = localeNumber(max, 2)
            let regx = "{(.*?)}"
            var alertText = this.props.t("alert_description")
            var match = alertText.match(regx)
            alertText = alertText.replace(match[0], `<b>${min}</b>`)
            match = alertText.match(regx)
            alertText = alertText.replace(match[0], `<b>${max}</b>`)
            return alertText;
        }
        return uppercaseFirst(type)
    }
    setAlert(alert, type, enabled, dontUpdate) {
        type = type.toLowerCase()
        if (alert) {
            if (enabled !== null) alert.enabled = enabled;
        } else {
            alert = {
                type: type,
                enabled: true,
                ...getAlertRange(type)
            }
        }
        this.setState({ ...this.state, alert: alert, editDescription: false, editMinValue: false, editMaxValue: false, rangeInputDialog: false })
        if (!dontUpdate) {
            this.props.onChange(alert)
        }
    }
    getMinMaxArr() {
        var alert = this.state.alert;
        if (this.props.type === "Pressure") return [alert.min / 100, alert.max / 100]
        return [alert.min, alert.max]
    }
    render() {
        var alert = this.state.alert;
        var x = this.props.type;
        var t = this.props.t
        return (
            <ListItem key={x} style={{ color: alert && alert.triggered ? "#f27575" : undefined }}>
                <div style={{ paddingTop: x !== "Movement" ? 10 : 0, paddingBottom: 10 }}>
                    <table width="100%" style={this.props.accordionContent}>
                        <tbody>
                            <tr>
                                <td width="50%">
                                    <div style={this.props.detailedTitle}>{t(x.toLocaleLowerCase())}</div>
                                    <div style={this.props.detailedSubText}>{alert && alert.enabled && <EditableText text={this.getAlertText(alert, x.toLocaleLowerCase())} onClick={() => this.setState({ ...this.state, rangeInputDialog: true })} />}</div>
                                </td>
                                <td style={this.props.detailedText}>
                                    <b>{alert && alert.enabled && <EditableText onClick={() => this.setState({ ...this.state, editDescription: true })} style={alertDescription} text={alert.description || t("alarm_custom_title_hint")} />}</b>
                                    <b style={{marginRight: 4}}>{alert && alert.enabled ? t("on") : t("off")}</b> <Switch isChecked={alert && alert.enabled} colorScheme="primaryScheme" onChange={e => this.setAlert(alert, x, e.target.checked)} />
                                </td>
                            </tr>
                            {x !== "Movement" && alert &&
                                <tr>
                                    <td colSpan="2">
                                        <Box mt="5">
                                            <AlertSlider disabled={!alert.enabled} type={x.toLowerCase()} value={alert} onChange={(v, final) => this.setAlert({ ...alert, min: v[0], max: v[1] }, x, true, !final)} />
                                        </Box>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <InputDialog open={this.state.editDescription} value={alert ? alert.description : ""}
                    onClose={(save, description) => save ? this.setAlert({ ...alert, description: description }, x, null, false) : this.setState({ ...this.state, editDescription: false })}
                    title={t("alarm_custom_title_hint")}
                    buttonText={t("update")}
                />
                <RangeInputDialog open={this.state.rangeInputDialog} value={alert ? this.getMinMaxArr() : null}
                    onClose={(save, value) => save ? this.setAlert({ ...alert, min: value[0] * (x === "Pressure" ? 100 : 1), max: value[1] * (x === "Pressure" ? 100 : 1), }, x, null, false) : this.setState({ ...this.state, rangeInputDialog: false })}
                    buttonText={t("update")}
                />
            </ListItem>
        )
    }
}

export default withTranslation()(AlertItem);