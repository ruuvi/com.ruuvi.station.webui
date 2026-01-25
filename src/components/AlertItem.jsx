import { Box, ListItem } from "@chakra-ui/layout";
import { Switch } from "@chakra-ui/switch";
import React, { Component, Suspense } from "react";
import { withTranslation } from 'react-i18next';
import { getAlertRange, getDisplayValue, getUnitHelper, localeNumber, round } from "../UnitHelper";
import EditableText from "./EditableText";
import InputDialog from "./InputDialog";
import RangeInputDialog from "./RangeInputDialog";
import pjson from '../../package.json';
import ScreenSizeWrapper from "./ScreenSizeWrapper";
import { getAlertIcon } from "../utils/alertHelper";
import { addVariablesInString } from "../TextHelper";
import UpgradePlanButton from "./UpgradePlanButton";
import { relativeToAbsolute, relativeToDewpoint } from "../utils/humidity";
const AlertSlider = React.lazy(() => import("./AlertSlider"));

class AlertItem extends Component {
    constructor(props) {
        super(props)
        let alert = this.props.alert
        if (alert) {
            this.checkAlertLimits(alert)
        }
        this.state = {
            alert: alert,
            editDescription: false,
            rangeInputDialog: false,
            delayInputDialog: false,
        }
        //alertRounding(this.state.alert)
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
        if (type === "offline") {
            if (max === +Infinity) max = 900
            return addVariablesInString(this.props.t("alert_offline_description"), [max / 60]);
        }
        var uh = getUnitHelper(this.props.dataKey)
        if (type !== "humidity" && type !== "humidityAbsolute") {
            // For dewPoint, use temperature conversion instead of humidity
            let conversionHelper = type === "dewPoint" ? getUnitHelper("temperature") : uh;
            min = conversionHelper.value(min)
            max = conversionHelper.value(max)
            // workaround for F -> C -> F rounding error
            if ((type === "temperature" || type === "dewPoint") && conversionHelper.unit.indexOf("F") !== -1) {
                min = round(min, 1)
                max = round(max, 1)
            }
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
    getDelayText(alert) {
        let delay = alert?.delay || 0
        let text = this.props.t("alert_delay_description")
        text = addVariablesInString(text, [delay / 60])
        return text;
    }
    checkAlertLimits(alert) {
        try {
            let type = this.props.type;
            var { min, max, extended } = getAlertRange(type)
            if (extended) {
                min = extended.min
                max = extended.max
            }
            if (type === "temperature") {
                min = -Infinity
                max = +Infinity
            }
            if (type === "offline") {
                if (alert.max < min) alert.max = min
                if (alert.max > max) alert.max = max
                alert.min = 0;
            } else {
                if (alert.min < min) alert.min = min
                else if (alert.min > max) alert.min = max
                if (alert.max > max) alert.max = max
                else if (alert.max < min) alert.max = min
            }
        } catch {
            // not a big deal
        }
    }
    setAlert(alert, type, enabled, dontUpdate) {
        var wasEnabled = alert && alert.enabled
        if (alert && alert.type) {
            if (enabled !== null) alert.enabled = enabled;
        } else {
            alert = {
                type: type,
                enabled: enabled === true,
                ...getAlertRange(type),
                ...alert,
            }
        }
        if (alert.max === +Infinity) alert.max = 900
        this.checkAlertLimits(alert)
        this.setState({ ...this.state, alert: alert, editDescription: false, editMinValue: false, editMaxValue: false, rangeInputDialog: false, delayInputDialog: false })
        if (!dontUpdate) {
            this.props.onChange(alert, wasEnabled)
        }
    }
    getMinMaxArr() {
        var alert = this.state.alert;
        if (!alert) return null;
        var uh = getUnitHelper(this.props.dataKey)
        var type = this.props.type;
        if (type === "humidity" || type === "humidityAbsolute")
            return [alert.min, alert.max]
        // For dewPoint, use temperature conversion instead of humidity
        let conversionHelper = type === "dewPoint" ? getUnitHelper("temperature") : uh;
        let val = [conversionHelper.value(alert.min), conversionHelper.value(alert.max)]
        // workaround for F -> C -> F rounding error
        if ((type === "temperature" || type === "dewPoint") && conversionHelper.unit.indexOf("F") !== -1) {
            val[0] = round(val[0], 1)
            val[1] = round(val[1], 1)
        }
        return val
    }
    render() {
        var alert = this.state.alert;
        var type = this.props.type;
        var t = this.props.t
        var uh = getUnitHelper(this.props.dataKey)
        var enabled = alert && alert.enabled;
        var validRange = getAlertRange(type)
        if (type === "temperature" || type === "pressure" || type === "dewPoint" || type === "battery") {
            let min = validRange.min
            let max = validRange.max
            if (validRange.extended) {
                min = validRange.extended.min
                max = validRange.extended.max
            }
            // For dewPoint, use temperature conversion instead of humidity
            let conversionHelper = type === "dewPoint" ? getUnitHelper("temperature") : uh;
            validRange.min = conversionHelper.value(min)
            validRange.max = conversionHelper.value(max)
        }
        let label = type === "signal" ? "signal_strength" : type
        if (type === "offline") label = "alert_offline_title"
        if (type === "dewPoint") label = "dewpoint"
        if (type === "humidityAbsolute") label = "absolute_humidity"
        var editItemMargins = { marginRight: 0, marginTop: 12, marginBottom: 12 }
        const asText = (mobile) => <>
            <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                <EditableText spread={mobile} onClick={() => this.setState({ ...this.state, editDescription: true })} style={{ ...this.props.detailedSubText }} opacity={alert && alert.description ? null : 0.5} text={alert ? alert.description || t("alarm_custom_title_hint") : t("alarm_custom_title_hint")} />
            </div>
            <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ ...this.props.detailedSubText, width: mobile ? "100%" : undefined }}>
                    {type === "movement" ? <span>{this.getAlertText(alert, type)}</span> : <EditableText spread={mobile} text={this.getAlertText(alert, type)} onClick={() => this.setState({ ...this.state, rangeInputDialog: true })} />}
                </span>
            </div>
        </>
        const delaySetting = (mobile) => <>
            <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ ...this.props.detailedSubText, width: mobile ? "100%" : undefined }}>
                    {!mobile && !this.props.showDelay && !this.props.noUpgradeButton && <span style={{ marginRight: 8 }}><UpgradePlanButton /></span>}
                    <span>
                        <EditableText spread={mobile} text={this.getDelayText(alert)} onClick={() => this.setState({ ...this.state, delayInputDialog: true })} disabled={!this.props.showDelay} >
                            {mobile && !this.props.showDelay && !this.props.noUpgradeButton && <span style={{ marginLeft: 6, opacity: 1, pointerEvents: undefined, zIndex: 99 }}><UpgradePlanButton /></span>}
                        </EditableText>
                    </span>
                </span>
            </div>
        </>
        const getUnit = () => {
            return type !== "movement" && type !== "signal" && type !== "offline" ? ` ${type === "humidity" ? "%" : uh.unit}` : ""
        }

        const gayedOutOffline = () => {
            if (type === "offline" && !this.props.showOffline) {
                return { opacity: 0.5, pointerEvents: "none" }
            }
            return {}
        }

        const showUnitInTitle = !["movement", "signal", "offline"].includes(type);
        let titleUnitNode = null;
        if (showUnitInTitle) {
            // For humidity alerts, always show % (relative humidity), not converted units
            let displayUnit = type === "humidity" ? "%" : uh.unit;
            if (type === "humidityAbsolute") displayUnit = "g/m³";
            if (type === "dewPoint") displayUnit = getUnitHelper("temperature").unit;
            if (displayUnit) {
                titleUnitNode = <> ({displayUnit})</>;
            }
        }
        const latestUnitNode = () => {
            if (!showUnitInTitle) return null;
            // For humidity alerts, always show % (relative humidity), not converted units
            let displayUnit = type === "humidity" ? "%" : uh.unit;
            if (type === "humidityAbsolute") displayUnit = "g/m³";
            if (type === "dewPoint") displayUnit = getUnitHelper("temperature").unit;
            if (!displayUnit) return null;
            return <span> {displayUnit}</span>;
        }

        function getDialogTitle(type) {
            if (["temperature", "humidity", "pressure", "signal"].includes(type)) {
                return t("alert_dialog_title_" + type);
            }
            let key = type;
            if (uh) {
                key = uh.label || uh.shortLabel;
            }
            return t(key)
        }

        return (
            <>
                <div style={{ paddingTop: 30, paddingBottom: 20 }}>
                    <div style={{ ...this.props.detailedTitle, width: undefined, display: "flex", justifyContent: "space-between" }}>
                        <span>
                            {t(label)}{titleUnitNode}
                            {type === "offline" && !this.props.showOffline && !this.props.noUpgradeButton && <><Box ml={2} display="inline" /><UpgradePlanButton /></>}
                        </span>
                        <span style={gayedOutOffline()}>
                            <span style={{ display: "inline-block", marginRight: 24, marginBottom: -4 }}>
                                {getAlertIcon(this.props.sensor, type)}
                            </span>
                            <span style={{ ...this.props.detailedSubText, fontWeight: 400, marginRight: 4 }}>
                                {enabled ? t("on") : t("off")}
                            </span>
                            <Switch isChecked={alert && alert.enabled && !(type === "offline" && !this.props.showOffline)} colorScheme="buttonIconScheme" onChange={e => this.setAlert(alert, type, e.target.checked)} />
                        </span>
                    </div>
                    <span style={gayedOutOffline()}>
                        <ScreenSizeWrapper>
                            {asText()}
                        </ScreenSizeWrapper>
                        <ScreenSizeWrapper isMobile>
                            {asText(true)}
                        </ScreenSizeWrapper>
                        {type !== "movement" && type !== "offline" &&
                            <Box mt="4">
                                <Suspense fallback={
                                    <center style={{ width: "100%", marginTop: 100 }}>
                                        <span className='spinner'></span>
                                    </center>
                                }>
                                    <AlertSlider type={type} value={alert || { ...getAlertRange(this.props.type) }} onChange={(v, final) => this.setAlert({ ...alert, min: v[0], max: v[1] }, type, alert ? alert.enabled : false, !final)} />
                                </Suspense>
                                {this.props.latestValue !== undefined &&
                                    <div style={{ ...editItemMargins, display: "flex", justifyContent: "flex-end" }}>
                                        <span style={{ ...this.props.detailedSubText, opacity: 0.5 }}>
                                            {t("latest_measured_value").replace(/{(.*?)}/, (() => {
                                                if (type === "humidity") {
                                                    return localeNumber(this.props.latestValue, uh.decimals);
                                                } else if (type === "humidityAbsolute") {
                                                    // Convert relative humidity to absolute humidity
                                                    let latestReading = this.props.sensor.measurements?.[0]?.parsed;
                                                    if (latestReading && latestReading.temperature !== undefined) {
                                                        let absHum = relativeToAbsolute(this.props.latestValue, latestReading.temperature);
                                                        return localeNumber(absHum, 2);
                                                    }
                                                    return "-";
                                                } else if (type === "dewPoint") {
                                                    // Convert relative humidity to dew point
                                                    let latestReading = this.props.sensor.measurements?.[0]?.parsed;
                                                    if (latestReading && latestReading.temperature !== undefined) {
                                                        let dewPt = relativeToDewpoint(this.props.latestValue, latestReading.temperature);
                                                        return getDisplayValue("temperature", uh.value(dewPt));
                                                    }
                                                    return "-";
                                                } else {
                                                    return getDisplayValue(this.props.type, uh.value(this.props.latestValue));
                                                }
                                            })())}{latestUnitNode()}
                                        </span>
                                    </div>
                                }
                            </Box>
                        }
                    </span>
                    {type !== "offline" &&
                        <Box mt={5}>
                            <ScreenSizeWrapper>
                                {delaySetting()}
                            </ScreenSizeWrapper>
                            <ScreenSizeWrapper isMobile>
                                {delaySetting(true)}
                            </ScreenSizeWrapper>
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
                        onClose={(save, value) => {
                            if (save) {
                                // For dewPoint, use temperature conversion
                                let conversionHelper = type === "dewPoint" ? getUnitHelper("temperature") : uh;
                                this.setAlert({ ...alert, min: conversionHelper.fromUser(value[0]), max: conversionHelper.fromUser(value[1]) }, type, null, false);
                            } else {
                                this.setState({ ...this.state, rangeInputDialog: false });
                            }
                        }}
                        range={validRange}
                        title={getDialogTitle(type)}
                        buttonText={t("update")}
                        allowOutOfRange={type === "temperature" || type === "dewPoint"}
                        unit={() => {
                            if (type === "humidity") return "%";
                            if (type === "humidityAbsolute") return "g/m³";
                            if (type === "dewPoint") return getUnitHelper("temperature").unit;
                            return uh.unit;
                        }}
                    />
                }
                {type === "offline" &&
                    <InputDialog number open={this.state.rangeInputDialog} value={alert ? alert.max / 60 : 15}
                        onClose={(save, value) => save ? this.setAlert({ ...alert, min: 0, max: value * 60 }, type, null, false) : this.setState({ ...this.state, rangeInputDialog: false })}
                        title={t("alert_offline_dialog_title")}
                        description={t("alert_offline_dialog_description")}
                        buttonText={t("update")}
                        maxLength={pjson.settings.alertDescriptionMaxLength}
                    />
                }
                <InputDialog number open={this.state.delayInputDialog} value={alert && alert.delay ? alert.delay / 60 : 0}
                    onClose={(save, value) => save ? this.setAlert({ ...alert, delay: value * 60 }, type, null, false) : this.setState({ ...this.state, delayInputDialog: false })}
                    title={t("alert_delay")}
                    description={t("alert_delay_dialog_description")}
                    buttonText={t("update")}
                />
            </>
        )
    }
}

export default withTranslation()(AlertItem);