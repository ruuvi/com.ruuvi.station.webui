import React, { Component } from "react";
import logger from "../utils/logger";
import NetworkApi from "../NetworkApi";
import RadioInput from "../components/common/RadioInput";
import { Box, Progress, HStack } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import NavClose from "../components/common/NavClose";
import notify from "../utils/notify";
import LanguageMenu from '../components/menus/LanguageMenu';
import Store from "../Store";
import ResolutionSettings from "../components/settings/ResolutionSettings";

const header = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
}

const temperatureOptions = [
    { value: "C", label: "temperature_celsius_name" },
    { value: "F", label: "temperature_fahrenheit_name" },
    { value: "K", label: "temperature_kelvin_name" },
]
const humidityOptions = [
    { value: "0", label: "humidity_relative_name" },
    { value: "1", label: "humidity_absolute_name" },
    { value: "2", label: "humidity_dew_point_name" },
]
const pressureOptions = [
    { value: "0", label: "pressure_pa_name" },
    { value: "1", label: "pressure_hpa_name" },
    { value: "2", label: "pressure_mmhg_name" },
    { value: "3", label: "pressure_inhg_name" },
]

const boolOpt = [
    { value: true, label: "yes" },
    { value: false, label: "no" },
]

class Settings extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            settings: {
                UNIT_HUMIDITY: "0",
                UNIT_TEMPERATURE: "C",
                UNIT_PRESSURE: "1",
                ACCURACY_HUMIDITY: "2",
                ACCURACY_HUMIDITY_RELATIVE: "2",
                ACCURACY_HUMIDITY_ABSOLUTE: "2",
                ACCURACY_HUMIDITY_DEW_POINT: "2",
                ACCURACY_PRESSURE: "2",
                ACCURACY_TEMPERATURE: "2",
                ACCURACY_PM: "1",
                ACCURACY_ACCELERATION: "3",
                ACCURACY_VOLTAGE: "2"
            },
            CHART_DRAW_DOTS: Store.getGraphDrawDots(),
            savingSettings: [],
            savingSettingsStarted: {},
        }
    }
    componentDidMount() {
        new NetworkApi().getSettings(data => {
            if (data.result === "success") {
                var settings = this.state.settings;
                settings = { ...settings, ...data.data.settings };
                this.setState({ ...this.state, settings: settings, loading: false });
            } else {
                notify.error(this.props.t(`UserApiError.${data.result.code}`))
            }
        })
    }
    updateSetting(key, value) {
        const prevValue = this.state.settings[key]; // keep original to allow revert
        const settings = { ...this.state.settings, [key]: value };
        const saving = this.state.savingSettings.includes(key) ? this.state.savingSettings : [...this.state.savingSettings, key];
        const savingSettingsStarted = { ...this.state.savingSettingsStarted, [key]: Date.now() };
        this.setState({ ...this.state, settings, savingSettings: saving, savingSettingsStarted });

        const clearSaving = () => {
            const startedAt = this.state.savingSettingsStarted[key] || Date.now();
            const elapsed = Date.now() - startedAt;
            const remaining = 1000 - elapsed; // ensure at least 1s loading time
            const doClear = () => this.setState(prev => ({
                ...prev,
                savingSettings: prev.savingSettings.filter(x => x !== key),
                savingSettingsStarted: Object.fromEntries(Object.entries(prev.savingSettingsStarted).filter(([k]) => k !== key))
            }));
            if (remaining > 0) {
                setTimeout(doClear, remaining);
            } else {
                doClear();
            }
        };

        const revert = () => {
            this.setState(prev => ({
                ...prev,
                settings: { ...prev.settings, [key]: prevValue }
            }));
        }

        new NetworkApi().setSetting(key, value, b => {
            if (b.result === "success") {
                notify.success(this.props.t("successfully_saved"));
                clearSaving();
                new NetworkApi().getSettings(settings => {
                    if (settings.result === "success") {
                        localStorage.setItem("settings", JSON.stringify(settings.data.settings));
                        if (this.props.updateApp) this.props.updateApp();
                    }
                });
            } else if (b.result === "error") {
                notify.error(`UserApiError.${this.props.t(b.code)}`);
                revert();
                clearSaving();
            }
        }, error => {
            logger.error(error);
            notify.error(this.props.t("something_went_wrong"));
            revert();
            clearSaving();
        });
    }
    updateLocalSetting(key, value) {
        if (key === "CHART_DRAW_DOTS") {
            Store.setGraphDrawDots(value)
            this.setState({ ...this.state, CHART_DRAW_DOTS: value })
        }
        if (this.props.updateUI) this.props.updateUI()
    }
    cloudBoolValue(value) {
        if (value === undefined) return false
        return JSON.parse(value) ? true : false
    }
    render() {
        var content = <>
            {this.state.loading ? (
                <>
                    <Progress isIndeterminate={true} colorScheme="primaryScheme" />
                </>
            ) : (
                <>
                    <LanguageMenu onChange={v => this.updateSetting("PROFILE_LANGUAGE_CODE", v)} loading={this.state.savingSettings.indexOf("PROFILE_LANGUAGE_CODE") !== -1} />
                    <br />
                    <RadioInput label={"settings_temperature_unit"} value={this.state.settings.UNIT_TEMPERATURE} options={temperatureOptions} onChange={v => this.updateSetting("UNIT_TEMPERATURE", v)} loading={this.state.savingSettings.indexOf("UNIT_TEMPERATURE") !== -1} />
                    <br />
                    <RadioInput label={"settings_humidity_unit"} value={this.state.settings.UNIT_HUMIDITY} options={humidityOptions} onChange={v => this.updateSetting("UNIT_HUMIDITY", v)} loading={this.state.savingSettings.indexOf("UNIT_HUMIDITY") !== -1} />
                    <br />
                    <RadioInput label={"settings_pressure_unit"} value={this.state.settings.UNIT_PRESSURE} options={pressureOptions} onChange={v => this.updateSetting("UNIT_PRESSURE", v)} loading={this.state.savingSettings.indexOf("UNIT_PRESSURE") !== -1} />
                    <br />
                    <RadioInput label={"settings_chart_draw_dots"} value={this.state.CHART_DRAW_DOTS} options={boolOpt} onChange={v => this.updateLocalSetting("CHART_DRAW_DOTS", JSON.parse(v))} />
                    <br />
                    <RadioInput label={"settings_email_alerts"} value={!this.cloudBoolValue(this.state.settings.DISABLE_EMAIL_NOTIFICATIONS)} options={boolOpt} onChange={v => this.updateSetting("DISABLE_EMAIL_NOTIFICATIONS", JSON.parse(v) ? "0" : "1")} loading={this.state.savingSettings.indexOf("DISABLE_EMAIL_NOTIFICATIONS") !== -1} />
                    <br />
                    <RadioInput label={"settings_mobile_push_alerts"} value={!this.cloudBoolValue(this.state.settings.DISABLE_PUSH_NOTIFICATIONS)} options={boolOpt} onChange={v => this.updateSetting("DISABLE_PUSH_NOTIFICATIONS", JSON.parse(v) ? "0" : "1")} loading={this.state.savingSettings.indexOf("DISABLE_PUSH_NOTIFICATIONS") !== -1} />
                    <br /><br />
                    <hr style={{ marginBottom: 20 }} />
                    <ResolutionSettings settings={this.state.settings} savingSettings={this.state.savingSettings} updateSetting={(k, v) => this.updateSetting(k, v)} />
                </>
            )}
        </>

        if (this.props.isModal) return content

        return (
            <Box marginTop="36px" marginLeft={{ base: "10px", md: "20px", lg: "50px" }} marginRight={{ base: "10px", md: "20px", lg: "50px" }}>
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden" pb={{ base: "15px", md: "35px" }} pt={{ base: "15px", md: "35px" }} pl={{ base: "15px", md: "35px" }} pr={{ base: "15px", md: "35px" }} style={{ backgroundColor: "white" }}>
                    <HStack alignItems="start">
                        <span style={{ ...header, width: "65%" }}>
                            {this.props.t("settings")}
                        </span>
                        <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                            <NavClose />
                        </span>
                    </HStack>
                    <hr style={{ marginBottom: 20, marginTop: 15 }} />
                    {content}
                </Box>
            </Box>
        )
    }
}

export default withTranslation()(Settings);