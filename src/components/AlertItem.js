import { Box, ListItem } from "@chakra-ui/layout";
import { Switch } from "@chakra-ui/switch";
import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import { getAlertRange, localeNumber, temperatureToUserFormat } from "../UnitHelper";
import AlertSlider from "./AlertSlider";

var uppercaseFirst = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

class AlertItem extends Component {
    constructor(props) {
        super(props)
        this.state = {
            alert: this.props.alert,
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
            alertText = alertText.replace(match[0], min)
            match = alertText.match(regx)
            alertText = alertText.replace(match[0], max)
            return alertText;
        }
        return uppercaseFirst(type)
    }
    setAlert(alert, type, enabled, dontUpdate) {
        type = type.toLowerCase()
        if (alert) {
            alert.enabled = enabled;
        } else {
            alert = {
                type: type,
                enabled: true,
                ...getAlertRange(type)
            }
        }
        this.setState({ ...this.state, alert: alert })
        if (!dontUpdate) {
            this.props.onChange(alert)
        }
    }
    render() {
        var alert = this.state.alert;
        var x = this.props.type;
        var t = this.props.t
        return (
            <ListItem key={x} style={{ color: alert && alert.triggered ? "#f27575" : undefined }}>
                <table width="100%" style={this.props.accordionContent}>
                    <tbody>
                        <tr>
                            <td width="50%">
                                <div style={this.props.detailedTitle}>{t(x.toLocaleLowerCase())}</div>
                                <div style={this.props.detailedSubText}>{alert && alert.enabled && <span>{this.getAlertText(alert, x.toLocaleLowerCase())}</span>}</div>
                            </td>
                            <td style={this.props.detailedText}>
                                <Switch isChecked={alert && alert.enabled} onChange={e => this.setAlert(alert, x, e.target.checked)} />
                            </td>
                        </tr>
                        {x !== "Movement" && (alert && alert.enabled) &&
                            <tr>
                                <td colSpan="2">
                                    <Box mt="5">
                                        <AlertSlider type={x.toLowerCase()} value={alert} onChange={(v, final) => this.setAlert({ ...alert, min: v[0], max: v[1] }, x, true, !final)} />
                                    </Box>
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
                {x !== "Movement" && <hr />}
            </ListItem>
        )
    }
}

export default withTranslation()(AlertItem);