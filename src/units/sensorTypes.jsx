// Metadata for every sensor reading type: translation labels, units,
// raw-value conversion and display precision. `getUnitHelper` resolves an
// entry against the user's unit/accuracy settings.

import {
    humidityToUserFormat,
    pressureFromUserFormat,
    pressureToUserFormat,
    temperatureFromUserFormat,
    temperatureToUserFormat,
    vocToUserFormat
} from "./conversions";
import { readSettings } from "./settings";

const COMMON_UNITS = {
    degreeC: "°C",
    degreeF: "°F",
    kelvin: "K",
    percent: "%",
    gm3Plain: "g/m³",
    gm3JSX: <span>g/m<sup>3</sup></span>,
    mgm3Plain: "mg/m³",
    mgm3JSX: <span>mg/m<sup>3</sup></span>
};

const identity = (value) => value;

function defineSensorType(def) {
    return {
        unit: "",
        value: identity,
        fromUser: identity,
        decimals: 0,
        graphable: true,
        ...def
    };
}

const acceleration = (axis) => defineSensorType({
    label: `acceleration_${axis}`,
    shortLabel: `acc_${axis}`,
    infoLabel: "description_text_acceleration",
    unit: "g",
    value: (value) => value / 1000,
    decimals: 3
});

const particulateMatter = (size) => defineSensorType({
    label: `particulate_matter_${size}`,
    shortLabel: `pm${size}`,
    infoLabel: "description_text_pm",
    unit: "µg/m³",
    decimals: 1
});

const soundLevel = (kind) => defineSensorType({
    label: `sound_${kind}`,
    unit: "dBA",
    decimals: 1
});

const sensorTypes = {
    temperature: defineSensorType({
        label: "temperature",
        shortLabel: "temperature",
        unit: "°C",
        infoLabel: "description_text_temperature_celsius",
        units: [
            { translationKey: "°C", cloudStoreKey: "C", infoLabel: "description_text_temperature_celsius" },
            { translationKey: "°F", cloudStoreKey: "F", infoLabel: "description_text_temperature_fahrenheit" },
            { translationKey: "K", cloudStoreKey: "K", infoLabel: "description_text_temperature_kelvin" }
        ],
        displayUnits: { C: "°C", F: "°F", K: "K" },
        value: temperatureToUserFormat,
        valueWithUnit: (value, unitKey) => temperatureToUserFormat(value, null, { UNIT_TEMPERATURE: unitKey }),
        fromUser: temperatureFromUserFormat,
        decimals: 2
    }),
    humidity: defineSensorType({
        label: "humidity",
        unit: "%",
        infoLabel: "description_text_humidity_relative",
        units: [
            { translationKey: "%", cloudStoreKey: "0", infoLabel: "description_text_humidity_relative" },
            { translationKey: "g/m³", cloudStoreKey: "1", infoLabel: "description_text_humidity_absolute" },
            { translationKey: "dewpoint", cloudStoreKey: "2", infoLabel: "description_text_humidity_dewpoint" }
        ],
        displayVariants: {
            "0": { unitKey: "%", label: "relative_humidity" },
            "1": { unitKey: "g/m³", label: "absolute_humidity" },
            "2": { unitKey: "dewpoint", label: "dewpoint" }
        },
        value: humidityToUserFormat,
        valueWithUnit: (value, unitKey, temperature) => {
            const stored = readSettings();
            const settings = { UNIT_HUMIDITY: unitKey };
            if (stored.UNIT_TEMPERATURE) settings.UNIT_TEMPERATURE = stored.UNIT_TEMPERATURE;
            return humidityToUserFormat(value, temperature, settings);
        },
        decimals: 2
    }),
    pressure: defineSensorType({
        label: "air_pressure",
        shortLabel: "air_pressure",
        exportLabel: "pressure",
        infoLabel: "description_text_pressure",
        unit: "hPa",
        units: [
            { translationKey: "Pa", cloudStoreKey: "0" },
            { translationKey: "hPa", cloudStoreKey: "1" },
            { translationKey: "mmHg", cloudStoreKey: "2" },
            { translationKey: "inHg", cloudStoreKey: "3" }
        ],
        displayUnits: { "0": "Pa", "1": "hPa", "2": "mmHg", "3": "inHg" },
        value: pressureToUserFormat,
        valueWithUnit: (value, unitKey) => pressureToUserFormat(value, { UNIT_PRESSURE: unitKey }),
        fromUser: pressureFromUserFormat,
        decimals: 2
    }),
    movementCounter: defineSensorType({
        label: "movements",
        shortLabel: "movements",
        infoLabel: "description_text_movement"
    }),
    battery: defineSensorType({
        label: "battery_voltage",
        shortLabel: "battery",
        exportLabel: "voltage",
        infoLabel: "description_text_battery_voltage",
        unit: "V",
        value: (value) => value / 1000,
        fromUser: (value) => Math.round(value * 100) * 10,
        decimals: 2
    }),
    accelerationX: acceleration("x"),
    accelerationY: acceleration("y"),
    accelerationZ: acceleration("z"),
    rssi: defineSensorType({
        label: "signal_strength",
        shortLabel: "signal_strength",
        infoLabel: "description_text_signal_strength",
        unit: "dBm"
    }),
    txPower: defineSensorType({
        label: "tx_power",
        unit: "dBm",
        graphable: false
    }),
    mac: defineSensorType({
        label: "mac_address",
        graphable: false
    }),
    dataFormat: defineSensorType({
        label: "data_format",
        graphable: false
    }),
    measurementSequenceNumber: defineSensorType({
        label: "measurement_sequence_number",
        shortLabel: "meas_seq_number",
        exportLabel: "measurement_sequence_number",
        infoLabel: "description_text_measurement_sequence_number"
    }),
    pm10: particulateMatter("10"),
    pm25: particulateMatter("25"),
    pm40: particulateMatter("40"),
    pm100: particulateMatter("100"),
    co2: defineSensorType({
        label: "carbon_dioxide",
        shortLabel: "co2",
        infoLabel: "description_text_co2",
        unit: "ppm"
    }),
    voc: defineSensorType({
        label: "volatile_organic_compounds",
        shortLabel: "voc",
        infoLabel: "description_text_voc",
        units: [
            { translationKey: "", cloudStoreKey: "index" },
            { translationKey: "mgm3", cloudStoreKey: "ethanol_mgm3" },
            { translationKey: "mgm3", cloudStoreKey: "isobutylene_mgm3" },
            { translationKey: "mgm3", cloudStoreKey: "molhave_mgm3" }
        ],
        displayUnits: { index: "", ethanol_mgm3: "mg/m³", isobutylene_mgm3: "mg/m³", molhave_mgm3: "mg/m³" },
        valueWithUnit: vocToUserFormat
    }),
    nox: defineSensorType({
        label: "nitrogen_oxides",
        shortLabel: "nox",
        infoLabel: "description_text_nox"
    }),
    illuminance: defineSensorType({
        label: "illuminance",
        shortLabel: "light",
        exportLabel: "luminosity",
        unit: "lx"
    }),
    soundLevelInstant: soundLevel("instant"),
    soundLevelAvg: soundLevel("avg"),
    soundLevelPeak: soundLevel("peak"),
    aqi: defineSensorType({
        label: "air_quality",
        shortLabel: "air_quality",
        infoLabel: "description_text_air_quality",
        unit: "/100",
        noUnitInExport: true,
        exportLabel: "air_quality"
    })
};

export const allUnits = sensorTypes;

export const DEFAULT_VISIBLE_SENSOR_TYPES = ["aqi", "co2", "pm25", "voc", "nox", "temperature", "humidity", "pressure", "illuminance", "movementCounter", "soundLevelInstant"];

export function getUnitFor(key, setting) {
    switch (key) {
        case "temperature":
            switch (setting) {
                case "F": return "°F";
                case "K": return "K";
                default: return "°C";
            }
        case "humidity":
            switch (setting) {
                case "1": return "g/m³";
                case "2": {
                    const settings = readSettings();
                    return getUnitFor("temperature", settings.UNIT_TEMPERATURE);
                }
                default: return "%";
            }
        case "pressure":
            switch (setting) {
                case "0": return "Pa";
                case "2": return "mmHg";
                case "3": return "inHg";
                default: return "hPa";
            }
        default:
            return "";
    }
}

export function getUnitHelper(key, plaintext, unit) {
    const settings = readSettings();

    if (key && key.startsWith("tvoc_")) {
        const suffix = key.substring("tvoc_".length); // ethanol, isobutylene, molhave
        key = "voc";
        if (!unit) {
            if (suffix === "ethanol") unit = "ethanol_mgm3";
            else if (suffix === "isobutylene") unit = "isobutylene_mgm3";
            else if (suffix === "molhave") unit = "molhave_mgm3";
        }
    }

    const C = COMMON_UNITS;

    if (key === "temperature") {
        const setting = unit || settings.UNIT_TEMPERATURE || "C";
        let thing = { ...sensorTypes[key] };
        thing.unit = thing.displayUnits?.[setting] || thing.unit;
        let currUnit = thing.units.find(u => u.cloudStoreKey === setting);
        if (currUnit && currUnit.infoLabel) thing.infoLabel = currUnit.infoLabel;
        if (settings.ACCURACY_TEMPERATURE) thing.decimals = parseInt(settings.ACCURACY_TEMPERATURE);
        return thing;
    }

    if (key === "humidity") {
        const humSetting = unit ?? settings.UNIT_HUMIDITY ?? "0";
        let thing = { ...sensorTypes[key] };
        const variant = thing.displayVariants?.[humSetting];
        if (variant) {
            if (humSetting === "0") {
                // relative humidity
                thing.label = variant.label;
                thing.shortLabel = "rel_humidity";
                thing.unit = C.percent;
            } else if (humSetting === "1") {
                // absolute humidity
                thing.label = variant.label;
                thing.shortLabel = "abs_humidity";
                thing.infoLabel = "description_text_humidity_absolute";
                thing.unit = plaintext ? C.gm3Plain : C.gm3JSX;
            } else if (humSetting === "2") {
                // dew point
                thing.label = variant.label;
                thing.shortLabel = "dewpoint";
                thing.infoLabel = "description_text_humidity_dewpoint";
                const tempSetting = settings.UNIT_TEMPERATURE || "C";
                thing.unit = tempSetting === "F" ? C.degreeF : tempSetting === "K" ? C.kelvin : C.degreeC;
            }
        }
        if (settings.ACCURACY_HUMIDITY) thing.decimals = parseInt(settings.ACCURACY_HUMIDITY);
        return thing;
    }

    if (key === "pressure") {
        const pSetting = unit ?? settings.UNIT_PRESSURE ?? "1"; // default hPa
        let thing = { ...sensorTypes[key] };
        thing.unit = thing.displayUnits?.[pSetting] || thing.unit;
        if (pSetting === "0") thing.decimals = 0; // Pa, no decimals
        else if (settings.ACCURACY_PRESSURE) thing.decimals = parseInt(settings.ACCURACY_PRESSURE);
        return thing;
    }

    if (key === "voc") {
        let thing = { ...sensorTypes[key] };
        const vocUnit = unit ?? settings.UNIT_VOC ?? "index";
        if (["ethanol_mgm3", "isobutylene_mgm3", "molhave_mgm3"].includes(vocUnit)) {
            thing.unit = plaintext ? C.mgm3Plain : C.mgm3JSX;
            const suffix = vocUnit.substring(0, vocUnit.indexOf("_"));
            thing.shortLabel = "TVOC" + suffix.charAt(0).toUpperCase() + suffix.slice(1);
            if (!plaintext) {
                thing.shortLabel = <span>TVOC<sub>{suffix.charAt(0).toUpperCase() + suffix.slice(1)}</sub></span>;
            }
            thing.label = "total_volatile_organic_compounds";
            thing.decimals = 2;
        } else {
            thing.unit = thing.displayUnits?.[vocUnit] ?? "";
        }
        return thing;
    }

    if (key === "signal") key = "rssi"; // alias

    if (sensorTypes[key]) return { ...sensorTypes[key] };
    return { label: "", unit: "", value: identity, decimals: 0 };
}

export function getUnitHelperWithUnit(key, plaintext, unit) {
    return getUnitHelper(key, plaintext, unit);
}

// Helpers for "<type>_<unit>" option strings, e.g. "humidity_1", "voc_ethanol_mgm3".
export function getSensorTypeOnly(opt) {
    if (opt == null) return null;
    const index = opt.indexOf("_");
    return index === -1 ? opt : opt.substring(0, index);
}

export function getUnitOnly(opt) {
    if (opt == null) return null;
    const index = opt.indexOf("_");
    return index === -1 ? opt : opt.substring(index + 1);
}
