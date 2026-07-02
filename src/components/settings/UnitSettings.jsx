import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import RadioInput from "../common/RadioInput";

const temperatureOptions = [
    { value: "C", label: "temperature_celsius_name" },
    { value: "F", label: "temperature_fahrenheit_name" },
    { value: "K", label: "temperature_kelvin_name" },
]
// Dew point (value "2") is no longer offered as a humidity unit. It is only shown
// when it is the currently selected value, so existing selections stay visible; once
// the user picks another unit it disappears and can no longer be selected.
const humidityOptions = [
    { value: "0", label: "humidity_relative_name" },
    { value: "1", label: "humidity_absolute_name" },
]
const dewPointOption = { value: "2", label: "humidity_dew_point_name" }
const pressureOptions = [
    { value: "0", label: "pressure_pa_name" },
    { value: "1", label: "pressure_hpa_name" },
    { value: "2", label: "pressure_mmhg_name" },
    { value: "3", label: "pressure_inhg_name" },
]

export default function UnitSettings({ settings, savingSettings, updateSetting }) {
    const { t } = useTranslation();

    const humidityUnitOptions = settings.UNIT_HUMIDITY === "2"
        ? [...humidityOptions, dewPointOption]
        : humidityOptions;

    return (
        <Box>
            <Text fontSize="sm" mb={4} opacity={0.7}>
                {t("unit_settings_description")}
            </Text>

            <RadioInput
                label={"settings_temperature_unit"}
                value={settings.UNIT_TEMPERATURE}
                options={temperatureOptions}
                onChange={v => updateSetting("UNIT_TEMPERATURE", v)}
                loading={savingSettings.indexOf("UNIT_TEMPERATURE") !== -1}
            />
            <br />

            <RadioInput
                label={"settings_humidity_unit"}
                value={settings.UNIT_HUMIDITY}
                options={humidityUnitOptions}
                onChange={v => updateSetting("UNIT_HUMIDITY", v)}
                loading={savingSettings.indexOf("UNIT_HUMIDITY") !== -1}
            />
            <br />

            <RadioInput
                label={"settings_pressure_unit"}
                value={settings.UNIT_PRESSURE}
                options={pressureOptions}
                onChange={v => updateSetting("UNIT_PRESSURE", v)}
                loading={savingSettings.indexOf("UNIT_PRESSURE") !== -1}
            />
        </Box>
    );
}
