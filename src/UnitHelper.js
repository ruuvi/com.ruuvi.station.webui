const unitHelper = {
    "temperature": { label: "Temperature", unit: "°C", value: (value) => value, decimals: 2 },
    "humidity": { label: "Humidity", unit: "%", value: (value) => value, decimals: 2 },
    "pressure": { label: "Pressure", unit: "hPa", value: (value) => value / 100, decimals: 2 },
    "movementCounter": { label: "Movement", unit: "Times", value: (value) => value, decimals: 0 },
    "battery": { label: "Battery", unit: "V", value: (value) => value / 1000, decimals: 3 },
    "accelerationX": { label: "Acceleration X", unit: "g", value: (value) => value / 1000, decimals: 3 },
    "accelerationY": { label: "Acceleration Y", unit: "g", value: (value) => value / 1000, decimals: 3 },
    "accelerationZ": { label: "Acceleration Z", unit: "g", value: (value) => value / 1000, decimals: 3 },
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
    return value.toLocaleString("fi-FI", { minimumFractionDigits: decimals })
}