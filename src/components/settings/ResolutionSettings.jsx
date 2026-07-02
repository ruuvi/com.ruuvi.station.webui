import React, { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import RadioInput from "../common/RadioInput";
import { getUnitFor, getMaxDecimals, localeNumber } from "../../UnitHelper";

function resolutionOptions(type, unitVal, maxDecimals) {
    let unit = getUnitFor(type, unitVal);
    const opts = [];
    for (let i = 0; i <= maxDecimals; i++) {
        const step = Math.pow(10, -i);
        opts.push({ value: String(i), label: `${localeNumber(step)} ${unit}` });
    }
    return opts;
}

function getSensorsFromCache() {
    try {
        return JSON.parse(localStorage.getItem("sensors")) || [];
    } catch {
        return [];
    }
}

function hasSensorWithDataFormat(sensors, formats) {
    return sensors.some(s => {
        const df = s.measurements?.[0]?.parsed?.dataFormat;
        return df !== undefined && formats.includes(df);
    });
}

const HUMIDITY_VARIANTS = [
    { cloudStoreKey: "0", accuracyKey: "ACCURACY_HUMIDITY_RELATIVE", translationKey: "humidity_relative_resolution" },
    { cloudStoreKey: "1", accuracyKey: "ACCURACY_HUMIDITY_ABSOLUTE", translationKey: "humidity_absolute_resolution" },
    { cloudStoreKey: "2", accuracyKey: "ACCURACY_HUMIDITY_DEW_POINT", translationKey: "humidity_dew_point_resolution" },
];

export default function ResolutionSettings({ settings, savingSettings, updateSetting }) {
    const { t } = useTranslation();

    const sensors = useMemo(() => getSensorsFromCache(), []);

    const showPM = useMemo(() => hasSensorWithDataFormat(sensors, ["e0", "e1"]), [sensors]);
    const showAcceleration = useMemo(() => hasSensorWithDataFormat(sensors, [3, 5, "c5", "e0", "e1"]), [sensors]);
    const showVoltage = useMemo(() => hasSensorWithDataFormat(sensors, [3, 5, "c5"]), [sensors]);

    return (
        <Box>
            <Text fontSize="sm" mb={4} opacity={0.7}>
                {t("resolution_settings_description")}
            </Text>

            <RadioInput
                label={"temperature_resolution"}
                value={settings.ACCURACY_TEMPERATURE}
                options={resolutionOptions("temperature", settings.UNIT_TEMPERATURE, getMaxDecimals("temperature"))}
                onChange={v => updateSetting("ACCURACY_TEMPERATURE", v)}
                loading={savingSettings.indexOf("ACCURACY_TEMPERATURE") !== -1}
            />
            <br />

            {HUMIDITY_VARIANTS.map(variant => (
                <React.Fragment key={variant.cloudStoreKey}>
                    <RadioInput
                        label={variant.translationKey}
                        value={settings[variant.accuracyKey] || settings.ACCURACY_HUMIDITY || "2"}
                        options={resolutionOptions("humidity", variant.cloudStoreKey, getMaxDecimals("humidity"))}
                        onChange={v => updateSetting(variant.accuracyKey, v)}
                        loading={savingSettings.indexOf(variant.accuracyKey) !== -1}
                    />
                    <br />
                </React.Fragment>
            ))}

            <RadioInput
                label={"pressure_resolution"}
                value={settings.ACCURACY_PRESSURE}
                options={resolutionOptions("pressure", settings.UNIT_PRESSURE, getMaxDecimals("pressure"))}
                onChange={v => updateSetting("ACCURACY_PRESSURE", v)}
                loading={savingSettings.indexOf("ACCURACY_PRESSURE") !== -1}
            />
            <br />

            {showPM && <>
                <RadioInput
                    label={"pm_resolution"}
                    value={settings.ACCURACY_PM || "1"}
                    options={resolutionOptions("pm25", null, getMaxDecimals("pm25"))}
                    onChange={v => updateSetting("ACCURACY_PM", v)}
                    loading={savingSettings.indexOf("ACCURACY_PM") !== -1}
                />
                <br />
            </>}

            {showAcceleration && <>
                <RadioInput
                    label={"acceleration_resolution"}
                    value={settings.ACCURACY_ACCELERATION || "3"}
                    options={resolutionOptions("accelerationX", null, getMaxDecimals("accelerationX"))}
                    onChange={v => updateSetting("ACCURACY_ACCELERATION", v)}
                    loading={savingSettings.indexOf("ACCURACY_ACCELERATION") !== -1}
                />
                <br />
            </>}

            {showVoltage && <>
                <RadioInput
                    label={"voltage_resolution"}
                    value={settings.ACCURACY_VOLTAGE || "2"}
                    options={resolutionOptions("battery", null, getMaxDecimals("battery"))}
                    onChange={v => updateSetting("ACCURACY_VOLTAGE", v)}
                    loading={savingSettings.indexOf("ACCURACY_VOLTAGE") !== -1}
                />
                <br />
            </>}
        </Box>
    );
}
