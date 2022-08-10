import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import RadioInput from "../components/RadioInput";
import { Box, Progress, HStack, FormControl, FormLabel } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import NavClose from "../components/NavClose";
import notify from "../utils/notify";
import LanguageMenu from '../components/LanguageMenu';
import { t } from "i18next";

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

class Settings extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            settings: {
                UNIT_HUMIDITY: "0",
                UNIT_TEMPERATURE: "C",
                UNIT_PRESSURE: "1",
            },
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
                    if (settings.result === "success")
                        localStorage.setItem("settings", JSON.stringify(settings.data.settings))
                })
            } else if (b.result === "error") {
                notify.error(`UserApiError.${this.props.t(b.code)}`)
            }
        }, error => {
            console.log(error);
            notify.error(this.props.t("something_went_wrong"))
        })
    }
    render() {
        var content = <>
            {this.state.loading ? (
                <>
                    <Progress isIndeterminate={true} colorScheme="primaryScheme" />
                </>
            ) : (
                <>
                    <FormControl  style={{marginBottom: -8}} >
                        <FormLabel>
                            {t("language")}
                        </FormLabel>
                        <LanguageMenu/>
                    </FormControl>
                    <br />
                    <RadioInput label={"settings_temperature_unit"} value={this.state.settings.UNIT_TEMPERATURE} options={temperatureOptions} onChange={v => this.updateSetting("UNIT_TEMPERATURE", v)} loading={this.state.savingSettings.indexOf("UNIT_TEMPERATURE") !== -1} />
                    <br />
                    <RadioInput label={"settings_humidity_unit"} value={this.state.settings.UNIT_HUMIDITY} options={humidityOptions} onChange={v => this.updateSetting("UNIT_HUMIDITY", v)} loading={this.state.savingSettings.indexOf("UNIT_HUMIDITY") !== -1} />
                    <br />
                    <RadioInput label={"settings_pressure_unit"} value={this.state.settings.UNIT_PRESSURE} options={pressureOptions} onChange={v => this.updateSetting("UNIT_PRESSURE", v)} loading={this.state.savingSettings.indexOf("UNIT_PRESSURE") !== -1} />
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