import { Box, ListItem } from "@chakra-ui/layout";
import { Switch } from "@chakra-ui/switch";
import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import { getAlertRange, getUnitHelper, localeNumber } from "../UnitHelper";
import AlertSlider from "./AlertSlider";
import EditableText from "./EditableText";
import InputDialog from "./InputDialog";
import RangeInputDialog from "./RangeInputDialog";
import pjson from '../../package.json';
import ScreenSizeWrapper from "./ScreenSizeWrapper";

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
        min = localeNumber(min)
        max = localeNumber(max)
        let regx = "{(.*?)}"
        var alertText = this.props.t("alert_description")
        var match = alertText.match(regx)
        alertText = alertText.replace(match[0], `<b>${min}</b>`)
        match = alertText.match(regx)
        alertText = alertText.replace(match[0], `<b>${max}</b>`)
        return alertText;
    }
    setAlert(alert, type, enabled, dontUpdate) {
        var wasEnabled = alert && alert.enabled
        if (alert && alert.type) {
            if (enabled !== null) alert.enabled = enabled;
        } else {
            alert = {
                ...alert,
                type: type,
                enabled: enabled === true,
                ...getAlertRange(type)
            }
        }
        this.setState({ ...this.state, alert: alert, editDescription: false, editMinValue: false, editMaxValue: false, rangeInputDialog: false })
        if (!dontUpdate) {
            this.props.onChange(alert, wasEnabled)
        }
    }
    getMinMaxArr() {
        var alert = this.state.alert;
        if (!alert) return null;
        var uh = getUnitHelper(this.props.type.toLowerCase())
        if (this.props.type.toLowerCase() === "humidity")
            return [alert.min, alert.max]
        return [uh.value(alert.min), uh.value(alert.max)]
    }
    render() {
        var alert = this.state.alert;
        var type = this.props.type.toLowerCase();
        var t = this.props.t
        var uh = getUnitHelper(type)
        var enabled = alert && alert.enabled;
        var validRange = getAlertRange(type)
        if (type === "temperature" || type === "pressure") {
            validRange.min = uh.value(validRange.min)
            validRange.max = uh.value(validRange.max)
        }
        var editItemMargins = { marginRight: 12, marginTop: 12, marginBottom: 12 }
        return (
            <ListItem key={type} style={{ color: alert && alert.enabled && alert.triggered ? "#f27575" : undefined }}>
                <div style={{ paddingTop: 30, paddingBottom: 20 }}>
                    <div style={{ ...this.props.detailedTitle, width: undefined, display: "flex", justifyContent: "space-between" }}>
                        <span>
                            {t(type) + (type !== "movement" ? ` (${type === "humidity" ? "%" : uh.unit})` : "")}
                        </span>
                        <span>
                            <span style={{ ...this.props.detailedText, marginRight: 4 }}>{enabled ? t("on") : t("off")}</span> <Switch isChecked={alert && alert.enabled} colorScheme="primaryScheme" onChange={e => this.setAlert(alert, type, e.target.checked)} />
                        </span>
                    </div>
                    <ScreenSizeWrapper isMobile>
                        <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                            <EditableText onClick={() => this.setState({ ...this.state, editDescription: true })} style={{ ...this.props.detailedSubText, opacity: alert && alert.description ? null : 0.5 }} text={alert ? alert.description || t("alarm_custom_title_hint") : t("alarm_custom_title_hint")} />
                        </div>
                        <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                            <span style={this.props.detailedSubText}>{type === "movement" ? <span>{this.getAlertText(alert, type)}</span> : <EditableText text={this.getAlertText(alert, type)} onClick={() => this.setState({ ...this.state, rangeInputDialog: true })} />}</span>
                        </div>
                    </ScreenSizeWrapper>
                    <ScreenSizeWrapper>
                        <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                            <EditableText spread onClick={() => this.setState({ ...this.state, editDescription: true })} style={{ ...this.props.detailedSubText, opacity: alert && alert.description ? null : 0.5 }} text={alert ? alert.description || t("alarm_custom_title_hint") : t("alarm_custom_title_hint")} />
                        </div>
                        <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                            <span style={{ ...this.props.detailedSubText, width: "100%" }}>{type === "movement" ? <span>{this.getAlertText(alert, type)}</span> : <EditableText spread text={this.getAlertText(alert, type)} onClick={() => this.setState({ ...this.state, rangeInputDialog: true })} />}</span>
                        </div>
                    </ScreenSizeWrapper>
                    {type !== "movement" &&
                        <Box mt="4">
                            <AlertSlider type={type} value={alert || { ...getAlertRange(this.props.type) }} onChange={(v, final) => this.setAlert({ ...alert, min: v[0], max: v[1] }, type, alert ? alert.enabled : false, !final)} />
                        </Box>
                    }
                </div>
                <InputDialog open={this.state.editDescription} value={alert ? alert.description : ""}
                    onClose={(save, description) => save ? this.setAlert({ ...alert, description: description }, type, null, false) : this.setState({ ...this.state, editDescription: false })}
                    title={t("alarm_custom_title_hint")}
                    buttonText={t("update")}
                    maxLength={pjson.settings.alertDescriptionMaxLength}
                />
                {this.state.rangeInputDialog &&
                    <RangeInputDialog open={this.state.rangeInputDialog} value={this.getMinMaxArr()}
                        onClose={(save, value) => save ? this.setAlert({ ...alert, min: uh.fromUser(value[0]), max: uh.fromUser(value[1]) }, type, null, false) : this.setState({ ...this.state, rangeInputDialog: false })}
                        range={validRange}
                        buttonText={t("update")}
                        unit={() => {
                            if (type === "humidity") return "%";
                            return uh.unit;
                        }}
                    />
                }
            </ListItem>
        )
    }
}

export default withTranslation()(AlertItem);