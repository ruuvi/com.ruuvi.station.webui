const unitHelper = {
    "temperature": { label: "temperature", unit: "°C", value: (value, offset) => temperatureToUserFormat(value, offset), decimals: 2, graphable: true },
    "humidity": { label: "humidity", unit: "%", value: (value) => value, decimals: 2, graphable: true },
    "pressure": { label: "pressure", unit: "hPa", value: (value) => value / 100, decimals: 2, graphable: true },
    "movementCounter": { label: "movement_counter", unit: "times", value: (value) => value, decimals: 0, graphable: true },
    "battery": { label: "battery_voltage", unit: "V", value: (value) => value / 1000, decimals: 3, graphable: true },
    "accelerationX": { label: "acceleration_x", unit: "g", value: (value) => value / 1000, decimals: 3, graphable: true },
    "accelerationY": { label: "acceleration_y", unit: "g", value: (value) => value / 1000, decimals: 3, graphable: true },
    "accelerationZ": { label: "acceleration_z", unit: "g", value: (value) => value / 1000, decimals: 3, graphable: true },
    "rssi": { label: "signal_strength", unit: "dBm", value: (value) => value, decimals: 0, graphable: true },
    "txPower": { label: "tx_power", unit: "dBm", value: (value) => value, decimals: 0, graphable: false },
    "mac": { label: "mac_address", unit: "", value: (value) => value, decimals: 0, graphable: false },
    "dataFormat": { label: "data_format", unit: "", value: (value) => value, decimals: 0, graphable: false },
    "measurementSequenceNumber": { label: "measurement_sequence_number", unit: "", value: (value) => value, decimals: 0, graphable: true },
}

export function getUnitHelper(key) {
    if (key === "temperature") {
        var settings = localStorage.getItem("settings");
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
            }
        }
    }
    if (unitHelper[key])
        return unitHelper[key];
    return { label: "", unit: "", value: (value) => value, decimals: 0 };
}

export function localeNumber(value, decimals) {
    if (typeof (value) !== "number") return value
    if (decimals === undefined) return value.toLocaleString("fi-FI")
    return value.toLocaleString("fi-FI", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function temperatureToUserFormat(temperature, offset) {
    var settings = localStorage.getItem("settings");
    if (settings) {
        settings = JSON.parse(settings)
        if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "F") {
            temperature = (temperature * 1.8) + (offset ? 0 : 32);
        }
        else if (!offset && settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "K") {
            temperature = temperature + 273.15;
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
            return {max: 85, min: -40}
        case "humidity":
            return {max: 100, min: 0}
        case "pressure":
            return {max: 110000, min: 30000}
        default:
            return {max: 100, min: 0}
    }
}