import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import RadioInput from "../components/RadioInput";
import { Box, Progress, IconButton, HStack } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import { CloseIcon } from "@chakra-ui/icons";

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
            }
        }
    }
    componentDidMount() {
        new NetworkApi().getSettings(data => {
            console.log(data);
            if (data.result === "success") {
                var settings = this.state.settings;
                settings = { ...settings, ...data.data.settings };
                this.setState({ ...this.state, settings: settings, loading: false });
            } else {
                alert(this.props.t("error") + ": " + this.props.t(`UserApiError.${data.result.code}`))
            }
        })
    }
    updateSetting(key, value) {
        var settings = this.state.settings;
        settings[key] = value;
        this.setState({ ...this.state, settings: settings });
        new NetworkApi().setSetting(key, value, b => {
            console.log("success")
        })
    }
    render() {
        console.log(this.state)
        return (
            <Box marginTop="36px" marginLeft={{ base: "10px", md: "20px", lg: "50px" }} marginRight={{ base: "10px", md: "20px", lg: "50px" }}>
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden" pb={{ base: "5px", md: "35px" }} pt={{ base: "5px", md: "35px" }} pl={{ base: "5px", md: "35px" }} pr={{ base: "5px", md: "35px" }} style={{ backgroundColor: "white" }}>
                <HStack alignItems="start">
                    <span style={{ ...header, width: "65%" }}>
                        {this.props.t("settings")}
                    </span>
                    <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                        <IconButton isRound={true} onClick={() => this.props.history.push('/')} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><CloseIcon /></IconButton>
                    </span>
                    </HStack>
                    <hr style={{ marginBottom: 20, marginTop: 15 }} />
                    {this.state.loading ? (
                        <>
                            <Progress isIndeterminate={true} colorScheme="primaryScheme" />
                        </>
                    ) : (
                        <>
                            <RadioInput label={"settings_temperature_unit"} value={this.state.settings.UNIT_TEMPERATURE} options={temperatureOptions} onChange={v => this.updateSetting("UNIT_TEMPERATURE", v)} />
                            <br />
                            <RadioInput label={"settings_humidity_unit"} value={this.state.settings.UNIT_HUMIDITY} options={humidityOptions} onChange={v => this.updateSetting("UNIT_HUMIDITY", v)} />
                            <br />
                            <RadioInput label={"settings_pressure_unit"} value={this.state.settings.UNIT_PRESSURE} options={pressureOptions} onChange={v => this.updateSetting("UNIT_PRESSURE", v)} />
                        </>
                    )}
                </Box>
            </Box>
        )
    }
}

export default withTranslation()(Settings);