import { relativeToAbsolute, relativeToDewpoint } from "./utils/humidity";

const unitHelper = {
    "temperature": { label: "temperature", unit: "°C", value: (value, offset) => temperatureToUserFormat(value, offset), fromUser: (value) => temperatureFromUserFormat(value), decimals: 2, graphable: true },
    "humidity": { label: "humidity", unit: "%", value: (value, temperature) => humidityToUserFormat(value, temperature), fromUser: (value) => value, decimals: 2, graphable: true },
    "pressure": { label: "pressure", unit: "hPa", value: (value) => pressureToUserFormat(value), decimals: 2, fromUser: (value) => pressureFromUserFormat(value), graphable: true },
    "movementCounter": { label: "movement_counter", unit: "movements", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: true },
    "battery": { label: "battery_voltage", exportLabel: "voltage", unit: "V", value: (value) => value / 1000, fromUser: (value) => value, decimals: 3, graphable: true },
    "accelerationX": { label: "acceleration_x", unit: "g", value: (value) => value / 1000, fromUser: (value) => value, decimals: 3, graphable: true },
    "accelerationY": { label: "acceleration_y", unit: "g", value: (value) => value / 1000, fromUser: (value) => value, decimals: 3, graphable: true },
    "accelerationZ": { label: "acceleration_z", unit: "g", value: (value) => value / 1000, fromUser: (value) => value, decimals: 3, graphable: true },
    "rssi": { label: "signal_strength", unit: "dBm", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: true },
    "txPower": { label: "tx_power", unit: "dBm", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: false },
    "mac": { label: "mac_address", unit: "", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: false },
    "dataFormat": { label: "data_format", unit: "", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: false },
    "measurementSequenceNumber": { label: "measurement_sequence_number", unit: "", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: true },
    "pm1p0": { label: "pm1.0", unit: "µg/m³", value: (value) => value, fromUser: (value) => value, decimals: 1, graphable: true },
    "pm2p5": { label: "pm2.5", unit: "µg/m³", value: (value) => value, fromUser: (value) => value, decimals: 1, graphable: true },
    "pm4p0": { label: "pm4.0", unit: "µg/m³", value: (value) => value, fromUser: (value) => value, decimals: 1, graphable: true },
    "pm10p0": { label: "pm10.0", unit: "µg/m³", value: (value) => value, fromUser: (value) => value, decimals: 1, graphable: true },
    "co2": { label: "co2", unit: "ppm", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: true },
    "voc": { label: "voc", unit: "VOC Index", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: true },
    "nox": { label: "nox", unit: "NNOx Index", value: (value) => value, fromUser: (value) => value, decimals: 0, graphable: true },
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
                    settings = JSON.parse(settings)
                    return getUnitFor("temperature", settings.UNIT_TEMPERATURE)
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

export function getDisplayValue(key, value) {
    try {
        if (!["temperature", "humidity", "pressure"].includes(key)) return value
        let settings = localStorage.getItem("settings");
        if (settings) {
            settings = JSON.parse(settings)
            let resolution = 2;
            if (value != null) {
                if (key === "temperature") {
                    if (settings.ACCURACY_TEMPERATURE) resolution = parseInt(settings.ACCURACY_TEMPERATURE)
                    else resolution = unitHelper.temperature.decimals
                }
                if (key === "humidity") {
                    if (settings.ACCURACY_HUMIDITY) resolution = parseInt(settings.ACCURACY_HUMIDITY)
                    else resolution = unitHelper.humidity.decimals
                }
                if (key === "pressure") {
                    if (settings.ACCURACY_PRESSURE) resolution = parseInt(settings.ACCURACY_PRESSURE)
                    else resolution = unitHelper.pressure.decimals
                    // don't show decimals for Pa
                    if (settings.UNIT_PRESSURE === "0") resolution = 0
                }
                if (typeof (value) === "string") value = value.replace(" ", "").replace(",", ".").replace("−", "-")
                value = parseFloat(value).toFixed(resolution)
                value = localeNumber(+value, resolution)
            }
        }
    } catch (error) {
        console.log("getDisplayValue", error)
    }
    return value
}

export function getUnitHelper(key, plaintext) {
    if (key === "temperature") {
        let settings = localStorage.getItem("settings");
        if (settings) {
            settings = JSON.parse(settings);
            var thing = unitHelper[key];
            if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "F") {
                thing.unit = "°F";
                return thing;
            }
            else if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "K") {
                thing.unit = "K";
                return thing;
            } else {
                thing.unit = "°C";
                return thing;
            }
        }
    }
    if (key === "humidity") {
        let settings = localStorage.getItem("settings");
        let thing = unitHelper[key];
        if (settings) {
            settings = JSON.parse(settings)
            if (settings.UNIT_HUMIDITY && settings.UNIT_HUMIDITY === "1") {
                thing.unit = plaintext ? "g/m³" : <span>g/m<sup>3</sup></span>
                return thing;
            } else if (settings.UNIT_HUMIDITY && settings.UNIT_HUMIDITY === "2") {
                thing.unit = "°C"
                if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "F") {
                    thing.unit = "°F";
                }
                else if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "K") {
                    thing.unit = "K";
                }
                return thing;
            } else {
                thing.unit = "%"
                return thing;
            }
        }
    }
    if (key === "pressure") {
        let settings = localStorage.getItem("settings");
        let thing = unitHelper[key];
        if (settings) {
            settings = JSON.parse(settings)
            if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "0") {
                thing.unit = "Pa"
                return thing;
            } else if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "2") {
                thing.unit = "mmHg"
                return thing;
            } else if (settings.UNIT_PRESSURE && settings.UNIT_PRESSURE === "3") {
                thing.unit = "inHg"
                return thing;
            } else {
                thing.unit = "hPa"
                return thing;
            }
        }
    }
    if (key === "signal") key = "rssi"
    if (unitHelper[key])
        return unitHelper[key];
    return { label: "", unit: "", value: (value) => value, decimals: 0 };
}

export function localeNumber(value, decimals) {
    if (typeof (value) !== "number") return value
    if (isNaN(value)) return "-"
    if (decimals === undefined) return value.toLocaleString("fi-FI")
    return value.toLocaleString("fi-FI", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function temperatureToUserFormat(temperature, offset) {
    offset = offset === true;
    var settings = localStorage.getItem("settings");
    let roundTo = 2;
    if (settings) {
        settings = JSON.parse(settings)
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
            return { max: 85, min: -40 }
        case "humidity":
            return { max: 100, min: 0 }
        case "pressure":
            return { max: 115500, min: 50000 }
        case "signal":
            return { max: 0, min: -105 }
        case "offline":
            return { max: +Infinity, min: 120 }
        default:
            return { max: 100, min: 0 }
    }
}

// 0 = Relative (%)
// 1 = Absolute (g/m^3)
// 2 = Dew point (°)
export function humidityToUserFormat(humidity, temperature) {
    var settings = localStorage.getItem("settings");
    if (settings) {
        settings = JSON.parse(settings)
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
export function pressureToUserFormat(pressure, offset) {
    var settings = localStorage.getItem("settings");
    if (settings) {
        settings = JSON.parse(settings)
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

export function pressureFromUserFormat(pressure, offset) {
    var settings = localStorage.getItem("settings");
    if (settings) {
        settings = JSON.parse(settings)
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