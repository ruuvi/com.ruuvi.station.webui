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
import { ACCURACY_SETTING_KEYS, readSettings, UNIT_DEFAULTS, UNIT_SETTING_KEYS } from "./settings";

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

// Each entry in a type's `units` list describes one selectable unit variant.
// `translationKey`/`cloudStoreKey` are the long-standing public shape that
// pickers and exports read; the remaining fields tell getUnitHelper what to
// override on the base entry when that variant is selected:
//   symbol       display unit; defaults to translationKey
//   symbolJSX    rich-text unit, used unless plaintext is requested
//   getSymbol    computes the unit from settings (dewpoint follows the
//                temperature unit)
//   label, shortLabel, shortLabelJSX, infoLabel, decimals
// A `decimals` on the variant is final and wins over ACCURACY_* settings
// (Pa is always shown without decimals).

const temperatureSymbolFor = (setting) =>
    setting === "F" ? "°F" : setting === "K" ? "K" : "°C";

const vocMgm3 = (substance) => {
    const name = substance.charAt(0).toUpperCase() + substance.slice(1);
    return {
        translationKey: "mgm3",
        cloudStoreKey: `${substance}_mgm3`,
        symbol: "mg/m³",
        symbolJSX: <span>mg/m<sup>3</sup></span>,
        label: "total_volatile_organic_compounds",
        shortLabel: `TVOC${name}`,
        shortLabelJSX: <span>TVOC<sub>{name}</sub></span>,
        decimals: 2
    };
};

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
            {
                translationKey: "%", cloudStoreKey: "0",
                infoLabel: "description_text_humidity_relative",
                label: "relative_humidity", shortLabel: "rel_humidity",
                accuracyKey: "ACCURACY_HUMIDITY_RELATIVE"
            },
            {
                translationKey: "g/m³", cloudStoreKey: "1",
                infoLabel: "description_text_humidity_absolute",
                label: "absolute_humidity", shortLabel: "abs_humidity",
                symbolJSX: <span>g/m<sup>3</sup></span>,
                accuracyKey: "ACCURACY_HUMIDITY_ABSOLUTE"
            },
            {
                translationKey: "dewpoint", cloudStoreKey: "2",
                infoLabel: "description_text_humidity_dewpoint",
                label: "dewpoint", shortLabel: "dewpoint",
                getSymbol: (settings) => temperatureSymbolFor(settings.UNIT_TEMPERATURE),
                accuracyKey: "ACCURACY_HUMIDITY_DEW_POINT"
            }
        ],
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
            { translationKey: "Pa", cloudStoreKey: "0", decimals: 0 },
            { translationKey: "hPa", cloudStoreKey: "1" },
            { translationKey: "mmHg", cloudStoreKey: "2" },
            { translationKey: "inHg", cloudStoreKey: "3" }
        ],
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
            vocMgm3("ethanol"),
            vocMgm3("isobutylene"),
            vocMgm3("molhave")
        ],
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

// displayVariants is part of the public shape (dashboard pickers read it);
// derive it from the humidity variant list.
sensorTypes.humidity.displayVariants = Object.fromEntries(
    sensorTypes.humidity.units.map(u => [u.cloudStoreKey, { unitKey: u.translationKey, label: u.label }])
);

export const allUnits = sensorTypes;

export const DEFAULT_VISIBLE_SENSOR_TYPES = ["aqi", "co2", "pm25", "voc", "nox", "temperature", "humidity", "pressure", "illuminance", "movementCounter", "soundLevelInstant"];

export function getUnitFor(key, setting) {
    if (!["temperature", "humidity", "pressure"].includes(key)) {
        return sensorTypes[key]?.unit ?? "";
    }
    if (key === "humidity" && setting === "2") {
        // dewpoint is shown in the temperature unit
        return getUnitFor("temperature", readSettings().UNIT_TEMPERATURE);
    }
    const units = sensorTypes[key].units;
    const fallback = UNIT_DEFAULTS[UNIT_SETTING_KEYS[key]];
    const variant = units.find(u => u.cloudStoreKey === setting) ?? units.find(u => u.cloudStoreKey === fallback);
    return variant.symbol ?? variant.translationKey;
}

function resolveUnitSetting(key, unit, settings) {
    const settingKey = UNIT_SETTING_KEYS[key];
    const stored = settings[settingKey];
    const fallback = UNIT_DEFAULTS[settingKey];
    // temperature historically treats any falsy override as "use the stored
    // setting"; the others only fall through on null/undefined
    return key === "temperature" ? (unit || stored || fallback) : (unit ?? stored ?? fallback);
}

// Decimals for a resolved variant: a decimals on the variant is final
// (Pa is always 0), otherwise the user's ACCURACY_* setting applies.
// Variant-specific accuracyKey (e.g. ACCURACY_HUMIDITY_RELATIVE) takes
// precedence over the generic ACCURACY_SETTING_KEYS[key].
// Returns undefined when the type's base decimals should be kept.
function variantDecimals(key, variant, settings) {
    if (variant?.decimals !== undefined) return variant.decimals;
    const variantAccuracyKey = variant?.accuracyKey;
    const genericAccuracyKey = ACCURACY_SETTING_KEYS[key];
    // Try variant-specific key first (e.g. ACCURACY_HUMIDITY_RELATIVE)
    if (variantAccuracyKey) {
        const accuracy = settings[variantAccuracyKey];
        if (accuracy !== undefined) return parseInt(accuracy);
    }
    // Fall back to generic key (e.g. legacy ACCURACY_HUMIDITY)
    if (genericAccuracyKey) {
        const accuracy = settings[genericAccuracyKey];
        if (accuracy !== undefined) return parseInt(accuracy);
    }
    return undefined;
}

// Decimal count getDisplayValue should use for a value of this type,
// given a settings object (which may differ from localStorage).
export function displayDecimalsFor(key, settings) {
    const type = sensorTypes[key];
    const setting = resolveUnitSetting(key, undefined, settings);
    const variant = type.units?.find(u => u.cloudStoreKey === setting);
    return variantDecimals(key, variant, settings) ?? type.decimals;
}

// Base decimal count for a sensor type, before any user accuracy override.
export function getMaxDecimals(key) {
    return sensorTypes[key]?.decimals ?? 2;
}

function applyVariant(thing, variant, plaintext, settings) {
    const symbol = variant.getSymbol ? variant.getSymbol(settings) : (variant.symbol ?? variant.translationKey);
    thing.unit = plaintext ? symbol : (variant.symbolJSX ?? symbol);
    if (variant.label !== undefined) thing.label = variant.label;
    if (variant.shortLabel !== undefined) {
        thing.shortLabel = plaintext ? variant.shortLabel : (variant.shortLabelJSX ?? variant.shortLabel);
    }
    if (variant.infoLabel !== undefined) thing.infoLabel = variant.infoLabel;
}

export function getUnitHelper(key, plaintext, unit) {
    const settings = readSettings();

    if (key && key.startsWith("tvoc_")) {
        const substance = key.substring("tvoc_".length);
        key = "voc";
        if (!unit && ["ethanol", "isobutylene", "molhave"].includes(substance)) {
            unit = `${substance}_mgm3`;
        }
    }

    if (key === "signal") key = "rssi"; // alias

    const base = sensorTypes[key];
    if (!base) return { label: "", unit: "", value: identity, decimals: 0 };

    const thing = { ...base };

    // For types with selectable units (temperature, humidity, pressure, voc),
    // resolve the variant and apply its overrides.
    if (UNIT_SETTING_KEYS[key] && thing.units) {
        const setting = resolveUnitSetting(key, unit, settings);
        const variant = thing.units.find(u => u.cloudStoreKey === setting);
        if (variant) applyVariant(thing, variant, plaintext, settings);
        const decimals = variantDecimals(key, variant, settings);
        if (decimals !== undefined) thing.decimals = decimals;
    } else if (ACCURACY_SETTING_KEYS[key]) {
        // For single-unit types with accuracy keys (PM, acceleration, battery),
        // apply the accuracy setting directly.
        const accuracy = settings[ACCURACY_SETTING_KEYS[key]];
        if (accuracy !== undefined) thing.decimals = parseInt(accuracy);
    }

    return thing;
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
