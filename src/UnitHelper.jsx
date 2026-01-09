import { relativeToAbsolute, relativeToDewpoint } from "./utils/humidity";

const unitHelper = {
    _common: {
        degreeC: "°C",
        degreeF: "°F",
        kelvin: "K",
        percent: "%",
        gm3Plain: "g/m³",
        gm3JSX: <span>g/m<sup>3</sup></span>,
        mgm3Plain: "mg/m³",
        mgm3JSX: <span>mg/m<sup>3</sup></span>,
        dewpointLabel: "dewpoint",
        vocLabel: "volatile_organic_compounds",
        airPressurePa: "Pa",
        airPressureHPa: "hPa",
        airPressureMmHg: "mmHg",
        airPressureInHg: "inHg"
    },
    "temperature": {
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
        value: (value, offset, settings) => temperatureToUserFormat(value, offset, settings),
        valueWithUnit: (value, unitKey) => {
            return temperatureToUserFormat(value, null, { UNIT_TEMPERATURE: unitKey });
        },
        fromUser: (value) => temperatureFromUserFormat(value),
        decimals: 2,
        graphable: true
    },
    "humidity": {
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
        value: (value, temperature, settings) => humidityToUserFormat(value, temperature, settings),
        valueWithUnit: (value, unitKey, temperature) => {
            let settings = { UNIT_HUMIDITY: unitKey };

            try {
                const stored = localStorage.getItem("settings");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.UNIT_TEMPERATURE) {
                        settings.UNIT_TEMPERATURE = parsed.UNIT_TEMPERATURE;
                    }
                }
            } catch (e) {
                // will default to Celsius
            }

            return humidityToUserFormat(value, temperature, settings);
        },
        fromUser: (value) => value,
        decimals: 2,
        graphable: true
    },
    "pressure": {
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
        value: (value, settings) => pressureToUserFormat(value, settings),
        valueWithUnit: (value, unitKey) => {
            return pressureToUserFormat(value, { UNIT_PRESSURE: unitKey });
        },
        fromUser: (value) => pressureFromUserFormat(value),
        decimals: 2,
        graphable: true
    },
    "movementCounter": {
        label: "movements",
        shortLabel: "movements",
        infoLabel: "description_text_movement",
        unit: "",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: true
    },
    "battery": {
        label: "battery_voltage",
        shortLabel: "battery",
        exportLabel: "voltage",
        infoLabel: "description_text_battery_voltage",
        unit: "V",
        value: (value) => value / 1000,
        fromUser: (value) => value,
        decimals: 3,
        graphable: true
    },
    "accelerationX": {
        label: "acceleration_x",
        shortLabel: "acc_x",
        infoLabel: "description_text_acceleration",
        unit: "g",
        value: (value) => value / 1000,
        fromUser: (value) => value,
        decimals: 3,
        graphable: true
    },
    "accelerationY": {
        label: "acceleration_y",
        shortLabel: "acc_y",
        infoLabel: "description_text_acceleration",
        unit: "g",
        value: (value) => value / 1000,
        fromUser: (value) => value,
        decimals: 3,
        graphable: true
    },
    "accelerationZ": {
        label: "acceleration_z",
        shortLabel: "acc_z",
        infoLabel: "description_text_acceleration",
        unit: "g",
        value: (value) => value / 1000,
        fromUser: (value) => value,
        decimals: 3,
        graphable: true
    },
    "rssi": {
        label: "signal_strength",
        shortLabel: "signal_strength",
        infoLabel: "description_text_signal_strength",
        unit: "dBm",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: true
    },
    "txPower": {
        label: "tx_power",
        unit: "dBm",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: false
    },
    "mac": {
        label: "mac_address",
        unit: "",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: false
    },
    "dataFormat": {
        label: "data_format",
        unit: "",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: false
    },
    "measurementSequenceNumber": {
        label: "measurement_sequence_number",
        shortLabel: "meas_seq_number",
        exportLabel: "measurement_sequence_number",
        infoLabel: "description_text_measurement_sequence_number",
        unit: "",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: true
    },
    "pm10": {
        label: "particulate_matter_10",
        shortLabel: "pm10",
        infoLabel: "description_text_pm",
        unit: "µg/m³",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 1,
        graphable: true
    },
    "pm25": {
        label: "particulate_matter_25",
        shortLabel: "pm25",
        infoLabel: "description_text_pm",
        unit: "µg/m³",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 1,
        graphable: true
    },
    "pm40": {
        label: "particulate_matter_40",
        shortLabel: "pm40",
        infoLabel: "description_text_pm",
        unit: "µg/m³",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 1,
        graphable: true
    },
    "pm100": {
        label: "particulate_matter_100",
        shortLabel: "pm100",
        infoLabel: "description_text_pm",
        unit: "µg/m³",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 1,
        graphable: true
    },
    "co2": {
        label: "carbon_dioxide",
        shortLabel: "co2",
        infoLabel: "description_text_co2",
        unit: "ppm",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: true
    },
    "voc": {
        label: "volatile_organic_compounds",
        shortLabel: "voc",
        infoLabel: "description_text_voc",
        unit: "",
        units: [{ translationKey: "", cloudStoreKey: "index" }, { translationKey: "ethanol_mgm3", cloudStoreKey: "ethanol_mgm3" }, { translationKey: "isobutylene_mgm3", cloudStoreKey: "isobutylene_mgm3" }, { translationKey: "molhave_mgm3", cloudStoreKey: "molhave_mgm3" }],
        displayUnits: { index: "", ethanol_mgm3: "mg/m³", isobutylene_mgm3: "mg/m³", molhave_mgm3: "mg/m³" },
        value: (value) => value,
        fromUser: (value) => value,
        valueWithUnit: (value, unitKey) => {
            let voc_ethanol_ppb = (Math.log(501 - value) - 6.24) * -381.97;
            switch (unitKey) {
                case "ethanol_mgm3":
                    return voc_ethanol_ppb / 1.8843;
                case "isobutylene_mgm3":
                    return voc_ethanol_ppb * 2.3;
                case "molhave_mgm3":
                    return voc_ethanol_ppb * 4.5;
                default:
                    return value; // index
            }
        },
        decimals: 0,
        graphable: true
    },
    "nox": {
        label: "nitrogen_oxides",
        shortLabel: "nox",
        infoLabel: "description_text_nox",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: true
    },
    "illuminance": {
        label: "illuminance",
        shortLabel: "light",
        exportLabel: "luminosity",
        unit: "lx",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: true
    },
    "soundLevelInstant": {
        label: "sound_instant",
        unit: "dBA",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 1,
        graphable: true
    },
    "soundLevelAvg": {
        label: "sound_avg",
        unit: "dBA",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 1,
        graphable: true
    },
    "soundLevelPeak": {
        label: "sound_peak",
        unit: "dBA",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 1,
        graphable: true
    },
    "aqi": {
        label: "air_quality",
        shortLabel: "air_quality",
        infoLabel: "description_text_air_quality",
        unit: "/100",
        noUnitInExport: true,
        exportLabel: "air_quality",
        value: (value) => value,
        fromUser: (value) => value,
        decimals: 0,
        graphable: true
    }
};

export const allUnits = unitHelper;

export const alertTypes = ["temperature", "humidity", "pressure", "signal", "movement", "offline", "aqi", "co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "luminosity", "sound"];

export const DEFAULT_VISIBLE_SENSOR_TYPES = ["aqi", "co2", "pm25", "voc", "nox", "temperature", "humidity", "pressure", "illuminance", "movementCounter", "soundLevelInstant"];

export function getUnitSettingFor(key) {
    let map = {
        'temperature': 'UNIT_TEMPERATURE',
        'humidity': 'UNIT_HUMIDITY',
        'pressure': 'UNIT_PRESSURE',
        'voc': 'UNIT_VOC'
    }
    const defaults = {
        UNIT_HUMIDITY: "0",
        UNIT_TEMPERATURE: "C",
        UNIT_PRESSURE: "1",
        UNIT_VOC: "index",
    }
    let settings = localStorage.getItem("settings");
    if (settings) {
        settings = JSON.parse(settings)
        if (settings[map[key]]) return settings[map[key]]
    }
    if (defaults[map[key]]) return defaults[map[key]]
    return null
}

export function getUnitFor(key, setting) {
    switch (key) {
        case "temperature":
            switch (setting) {
                case "F": return "°F"
                case "K": return "K"
                default: return "°C"
            }
        case "humidity":
            switch (setting) {
                case "1": return "g/m³"
                case "2":
                    let settings = localStorage.getItem("settings");
                    if (settings) settings = JSON.parse(settings)
                    return getUnitFor("temperature", settings?.UNIT_TEMPERATURE)
                default: return "%"
            }
        case "pressure":
            switch (setting) {
                case "0": return "Pa"
                case "2": return "mmHg"
                case "3": return "inHg"
                default: return "hPa"
            }
        default:
            return ""
    }
}

export function getSetting(key, fallback) {
    try {
        let settings = localStorage.getItem("settings");
        if (settings) {
            settings = JSON.parse(settings)
            if (settings[key]) return settings[key]
        }
    } catch (error) {
        console.log("setSettings err", error)
    }
    return fallback
}

export function getDisplayValue(key, value, settings) {
    try {
        if (key === "aqi" && value != null) value = Math.round(value)
        if (!["temperature", "humidity", "pressure"].includes(key)) return value
        if (!settings) settings = localStorage.getItem("settings");
        if (settings) {
            settings = JSON.parse(settings)
            let resolution = 2;
            if (value != null) {
                if (key === "temperature") {
                    if (settings?.ACCURACY_TEMPERATURE) resolution = parseInt(settings.ACCURACY_TEMPERATURE)
                    else resolution = unitHelper.temperature.decimals
                }
                if (key === "humidity") {
                    if (settings?.ACCURACY_HUMIDITY) resolution = parseInt(settings.ACCURACY_HUMIDITY)
                    else resolution = unitHelper.humidity.decimals
                }
                if (key === "pressure") {
                    if (settings?.ACCURACY_PRESSURE) resolution = parseInt(settings.ACCURACY_PRESSURE)
                    else resolution = unitHelper.pressure.decimals
                    // don't show decimals for Pa
                    if (settings?.UNIT_PRESSURE === "0") resolution = 0
                }
                if (typeof value === "string") {
                    value = value.replace(" ", "").replace("−", "-");
                    const locale = navigator.language;
                    const numberFormat = new Intl.NumberFormat(locale);
                    const parts = numberFormat.formatToParts(12345.6);
                    const groupSeparator = parts.find(part => part.type === 'group').value;
                    const decimalSeparator = parts.find(part => part.type === 'decimal').value;
                    value = value.replace(new RegExp(`\\${groupSeparator}`, 'g'), '').replace(decimalSeparator, '.');
                }
                value = parseFloat(value).toFixed(resolution)
                value = localeNumber(+value, resolution)
            }
        }
    } catch (error) {
        console.log("getDisplayValue", error)
    }
    return value
}

export function getUnitHelper(key, plaintext, unit) {
    let originalKey = key;
    let settings = null;
    try {
        let raw = localStorage.getItem("settings");
        if (raw) settings = JSON.parse(raw);
    } catch (e) { /* ignore */ }

    if (key && key.startsWith("tvoc_")) {
        const suffix = key.substring("tvoc_".length); // ethanol, isobutylene, molhave
        key = "voc";
        if (!unit) {
            if (suffix === "ethanol") unit = "ethanol_mgm3";
            else if (suffix === "isobutylene") unit = "isobutylene_mgm3";
            else if (suffix === "molhave") unit = "molhave_mgm3";
        }
    }

    const C = unitHelper._common;

    if (key === "temperature") {
        const setting = unit || settings?.UNIT_TEMPERATURE || "C";
        let thing = { ...unitHelper[key] };
        thing.unit = thing.displayUnits?.[setting] || thing.unit;
        let currUnit = thing.units.find(u => u.cloudStoreKey === setting);
        if (currUnit && currUnit.infoLabel) thing.infoLabel = currUnit.infoLabel;
        if (settings?.ACCURACY_TEMPERATURE) thing.decimals = parseInt(settings.ACCURACY_TEMPERATURE)
        return thing;
    }

    if (key === "humidity") {
        const humSetting = unit ?? settings?.UNIT_HUMIDITY ?? "0";
        let thing = { ...unitHelper[key] };
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
                const tempSetting = settings?.UNIT_TEMPERATURE || "C";
                thing.unit = tempSetting === "F" ? C.degreeF : tempSetting === "K" ? C.kelvin : C.degreeC;
            }
        }
        if (settings?.ACCURACY_HUMIDITY) thing.decimals = parseInt(settings.ACCURACY_HUMIDITY)
        return thing;
    }

    if (key === "pressure") {
        const pSetting = unit ?? settings?.UNIT_PRESSURE ?? "1"; // default hPa
        let thing = { ...unitHelper[key] };
        thing.unit = thing.displayUnits?.[pSetting] || thing.unit;
        if (pSetting === "0") thing.decimals = 0; // Pa, no decimals
        else if (settings?.ACCURACY_PRESSURE) thing.decimals = parseInt(settings.ACCURACY_PRESSURE)
        return thing;
    }

    if (key === "voc") {
        let thing = { ...unitHelper[key] };
        const vocUnit = unit ?? settings?.UNIT_VOC ?? "index";
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

    if (unitHelper[key]) return { ...unitHelper[key] };
    return { label: "", unit: "", value: (value) => value, decimals: 0 };
}

export function getUnitHelperWithUnit(key, plaintext, unit) {
    return getUnitHelper(key, plaintext, unit);
}

export function localeNumber(value, decimals) {
    if (typeof (value) !== "number") return value
    if (isNaN(value)) return "-"
    let lng = navigator.language;
    if (!lng) lng = "fi-FI"
    if (decimals === undefined) return value.toLocaleString(lng)
    return value.toLocaleString(lng, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function temperatureToUserFormat(temperature, offset, settings) {
    offset = offset === true;
    if (!settings) {
        settings = localStorage.getItem("settings");
        if (settings) settings = JSON.parse(settings)
    }
    let roundTo = 2;
    if (settings) {
        if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "F") {
            temperature = (temperature * 1.8) + (offset ? 0 : 32);
        }
        else if (!offset && settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "K") {
            temperature = temperature + 273.15;
        }
    }
    return round(temperature, roundTo)
}

export function temperatureFromUserFormat(temperature) {
    var settings = localStorage.getItem("settings");
    if (settings) {
        settings = JSON.parse(settings)
        if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "F") {
            temperature = (temperature - 32) / 1.8;
        }
        else if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "K") {
            temperature = temperature - 273.15;
        }
    }
    return round(temperature, 2)
}

export function round(number, deciamals) {
    var f = 1;
    for (var i = 0; i < deciamals; i++) f += "0"
    f = +f
    return Math.round(number * f) / f
}

export function getAlertRange(type) {
    switch (type) {
        case "temperature":
            return { max: 85, min: -40, extended: { max: 150, min: -55 } }
        case "humidity":
            return { max: 100, min: 0 }
        case "pressure":
            return { max: 115500, min: 50000 }
        case "signal":
            return { max: 0, min: -105 }
        case "offline":
            return { max: +Infinity, min: 120 }
        case "aqi":
            return { max: 100, min: 0 }
        case "co2":
            return { max: 2500, min: 350 }
        case "voc":
            return { max: 500, min: 0 }
        case "nox":
            return { max: 500, min: 0 }
        case "pm10":
            return { max: 250, min: 0 }
        case "pm25":
            return { max: 250, min: 0 }
        case "pm40":
            return { max: 250, min: 0 }
        case "pm100":
            return { max: 250, min: 0 }
        case "luminosity":
            return { max: 144284, min: 0 }
        case "sound":
            return { max: 127, min: 0 }
        default:
            return { max: 100, min: 0 }
    }
}

// 0 = Relative (%)
// 1 = Absolute (g/m^3)
// 2 = Dew point (°)
export function humidityToUserFormat(humidity, temperature, settings) {
    if (!settings) {
        settings = localStorage.getItem("settings");
        if (settings) settings = JSON.parse(settings)
    }
    if (settings) {
        if (settings.UNIT_HUMIDITY && settings.UNIT_HUMIDITY === "1") {
            humidity = relativeToAbsolute(humidity, temperature)
        } else if (settings.UNIT_HUMIDITY && settings.UNIT_HUMIDITY === "2") {
            humidity = relativeToDewpoint(humidity, temperature, settings.UNIT_TEMPERATURE)
        }
    }
    return round(humidity, 2)
}

// 0 = Pascal (Pa)
// 1 = Hectopascal (hPa)
// 2 = Millimeter of mercury (mmHg)
// 3 = Inch of mercury (inHg)
export function pressureToUserFormat(pressure, settings) {
    if (!settings) {
        settings = localStorage.getItem("settings");
        if (settings) settings = JSON.parse(settings)
    }
    if (settings) {
        if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "0") {
        }
        else if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "2") {
            pressure /= mmMercuryMultiplier
        } else if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "3") {
            pressure /= inchMercuryMultiplier
        } else {
            pressure /= 100;
        }
    } else {
        pressure /= 100;
    }
    return round(pressure, 2)
}

export function pressureFromUserFormat(pressure, settings) {
    if (!settings) {
        settings = localStorage.getItem("settings");
        if (settings) settings = JSON.parse(settings)
    }
    if (settings) {
        if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "0") {
        }
        else if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "2") {
            pressure *= mmMercuryMultiplier
        } else if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "3") {
            pressure *= inchMercuryMultiplier
        } else {
            pressure *= 100;
        }
    } else {
        pressure *= 100;
    }
    return round(pressure, 2)
}
// pressure constants
const mmMercuryMultiplier = 133.322368;
const inchMercuryMultiplier = 3386.388666;


export function getSensorTypeOnly(opt) {
    if (opt == null) return null
    let o = opt
    let index = o.indexOf("_")
    if (index !== -1) {
        o = o.substring(0, index)
    }
    return o
}

export function getUnitOnly(opt) {
    if (opt == null) return null
    let o = opt
    let index = o.indexOf("_")
    if (index !== -1) {
        o = o.substring(index + 1)
    }
    return o
}
