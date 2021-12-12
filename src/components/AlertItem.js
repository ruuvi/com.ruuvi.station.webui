import { Box, ListItem } from "@chakra-ui/layout";
import { Switch } from "@chakra-ui/switch";
import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import { uppercaseFirst } from "../TextHelper";
import { getAlertRange, getUnitHelper, localeNumber, temperatureToUserFormat } from "../UnitHelper";
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
        if (type === "movement") {
            return this.props.t("alert_movement_description")
        }
        var { min, max } = getAlertRange(type)
        if (alert) {
            min = alert.min
            max = alert.max
        }
        var uh = getUnitHelper(type)
        if (type !== "humidity") {
            min = uh.value(min)
            max = uh.value(max)
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
        var uh = getUnitHelper(this.props.type.toLowerCase())
        return [uh.value(alert.min), uh.value(alert.max)]
    }
    render() {
        var alert = this.state.alert;
        var x = this.props.type;
        var t = this.props.t
        var uh = getUnitHelper(x.toLowerCase())
        var enabled = alert && alert.enabled;
        return (
            <ListItem key={x} style={{ color: alert && alert.triggered ? "#f27575" : undefined }}>
                <div style={{ paddingTop: x !== "Movement" ? 30 : 5, paddingBottom: 10 }}>
                    <table width="100%" style={this.props.accordionContent}>
                        <tbody>
                            <tr>
                                <td width="50%">
                                    <div style={{...this.props.detailedTitle, width: undefined}}>{t(x.toLocaleLowerCase())}</div>
                                    <div style={this.props.detailedSubText}>{this.props.type === "Movement" ? <span>{this.getAlertText(alert, x.toLocaleLowerCase())}</span> : <EditableText text={this.getAlertText(alert, x.toLocaleLowerCase())} onClick={() => this.setState({ ...this.state, rangeInputDialog: true })} />}</div>
                                </td>
                                <td style={this.props.detailedText}>
                                    <EditableText onClick={() => this.setState({ ...this.state, editDescription: true })} style={alertDescription} text={alert ? alert.description || t("alarm_custom_title_hint") : t("alarm_custom_title_hint")} />
                                    <span style={{ ...this.props.detailedText, marginRight: 4 }}>{enabled ? t("on") : t("off")}</span> <Switch isChecked={alert && alert.enabled} colorScheme="primaryScheme" onChange={e => this.setAlert(alert, x, e.target.checked)} />
                                </td>
                            </tr>
                            {x !== "Movement" &&
                                <tr>
                                    <td colSpan="2">
                                        <Box mt="8">
                                            <AlertSlider disabled={!alert || !alert.enabled} type={x.toLowerCase()} value={alert || {...getAlertRange(this.props.type)}} onChange={(v, final) => this.setAlert({ ...alert, min: v[0], max: v[1] }, x, true, !final)} />
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
                    onClose={(save, value) => save ? this.setAlert({ ...alert, min: uh.fromUser(value[0]), max: uh.fromUser(value[1])}, x, null, false) : this.setState({ ...this.state, rangeInputDialog: false })}
                    buttonText={t("update")}
                    unit={() => {
                        if (x === "Humidity") return "%";
                        return uh.unit;
                    }}
                />
            </ListItem>
        )
    }
}

export default withTranslation()(AlertItem);