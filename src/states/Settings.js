import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import RadioInput from "../components/RadioInput";
import { Box, Progress, HStack } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import NavClose from "../components/NavClose";
import notify from "../utils/notify";
import LanguageMenu from '../components/LanguageMenu';
import { getUnitFor } from "../UnitHelper";
import Store from "../Store";

const header = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
}

const tabbed = {
    marginLeft: "18px"
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
let resolutionOptions = (type, unitVal) => {
    let unit = getUnitFor(type, unitVal)
    return [
        { value: "0", label: "1 " + unit },
        { value: "1", label: "0,1 " + unit },
        { value: "2", label: "0,01 " + unit },
    ]
}

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
                ACCURACY_PRESSURE: "2",
                ACCURACY_TEMPERATURE: "2"
            },
            CHART_DRAW_DOTS: new Store().getGraphDrawDots(),
            savingSettings: [],
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
        var settings = this.state.settings;
        settings[key] = value;
        var saving = this.state.savingSettings;
        saving.push(key)
        this.setState({ ...this.state, settings: settings, savingSettings: saving });
        new NetworkApi().setSetting(key, value, b => {
            if (b.result === "success") {
                notify.success(this.props.t("successfully_saved"))
                var saving = this.state.savingSettings;
                saving = saving.filter(x => x !== key)
                this.setState({ ...this.state, savingSettings: saving });
                // reload settings in the safest way possible, will be improved in another issue
                new NetworkApi().getSettings(settings => {
                    if (settings.result === "success") {
                        localStorage.setItem("settings", JSON.stringify(settings.data.settings))
                        if (this.props.updateUI) this.props.updateUI()
                    }

                })
            } else if (b.result === "error") {
                notify.error(`UserApiError.${this.props.t(b.code)}`)
            }
        }, error => {
            console.log(error);
            notify.error(this.props.t("something_went_wrong"))
        })
    }
    updateLocalSetting(key, value) {
        if (key === "CHART_DRAW_DOTS") {
            new Store().setGraphDrawDots(value)
            this.setState({ ...this.state, CHART_DRAW_DOTS: value })
        }
        if (this.props.updateUI) this.props.updateUI()
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
                    <RadioInput label={"temperature_resolution"} style={tabbed} value={this.state.settings.ACCURACY_TEMPERATURE} options={resolutionOptions("temperature", this.state.settings.UNIT_TEMPERATURE)} onChange={v => this.updateSetting("ACCURACY_TEMPERATURE", v)} loading={this.state.savingSettings.indexOf("ACCURACY_TEMPERATURE") !== -1} />
                    <br />
                    <RadioInput label={"settings_humidity_unit"} value={this.state.settings.UNIT_HUMIDITY} options={humidityOptions} onChange={v => this.updateSetting("UNIT_HUMIDITY", v)} loading={this.state.savingSettings.indexOf("UNIT_HUMIDITY") !== -1} />
                    <br />
                    <RadioInput label={"humidity_resolution"} style={tabbed} value={this.state.settings.ACCURACY_HUMIDITY} options={resolutionOptions("humidity", this.state.settings.UNIT_HUMIDITY)} onChange={v => this.updateSetting("ACCURACY_HUMIDITY", v)} loading={this.state.savingSettings.indexOf("ACCURACY_HUMIDITY") !== -1} />
                    <br />
                    <RadioInput label={"settings_pressure_unit"} value={this.state.settings.UNIT_PRESSURE} options={pressureOptions} onChange={v => this.updateSetting("UNIT_PRESSURE", v)} loading={this.state.savingSettings.indexOf("UNIT_PRESSURE") !== -1} />
                    <br />
                    {this.state.settings.UNIT_PRESSURE !== "0" && <>
                        <RadioInput label={"pressure_resolution"} style={tabbed} value={this.state.settings.ACCURACY_PRESSURE} options={resolutionOptions("pressure", this.state.settings.UNIT_PRESSURE)} onChange={v => this.updateSetting("ACCURACY_PRESSURE", v)} loading={this.state.savingSettings.indexOf("ACCURACY_PRESSURE") !== -1} />
                        <br />
                    </>
                    }
                    <RadioInput label={"settings_chart_draw_dots"} value={this.state.CHART_DRAW_DOTS} options={boolOpt} onChange={v => this.updateLocalSetting("CHART_DRAW_DOTS", JSON.parse(v))} />
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