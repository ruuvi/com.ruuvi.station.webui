import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import RadioInput from "../common/RadioInput";

const sectionHeader = {
    fontFamily: "montserrat",
    fontSize: "18px",
    fontWeight: 700,
}

const temperatureOptions = [
    { value: "C", label: "temperature_celsius_name" },
    { value: "F", label: "temperature_fahrenheit_name" },
    { value: "K", label: "temperature_kelvin_name" },
]
// Dew point (value "2") is intentionally omitted: it is hidden from the humidity
// unit options and cannot be selected. If it was previously selected it stays as
// the stored value and is not changed automatically.
const humidityOptions = [
    { value: "0", label: "humidity_relative_name" },
    { value: "1", label: "humidity_absolute_name" },
]
const pressureOptions = [
    { value: "0", label: "pressure_pa_name" },
    { value: "1", label: "pressure_hpa_name" },
    { value: "2", label: "pressure_mmhg_name" },
    { value: "3", label: "pressure_inhg_name" },
]

export default function UnitSettings({ settings, savingSettings, updateSetting }) {
    const { t } = useTranslation();

    return (
        <Box>
            <Text style={sectionHeader}>{t("unit_settings")}</Text>
            <Text fontSize="sm" mt={1} mb={4} opacity={0.7}>
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
                options={humidityOptions}
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
