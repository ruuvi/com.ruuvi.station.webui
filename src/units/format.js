// Locale-aware display formatting of sensor values.

import logger from "../utils/logger";
import { displayDecimalsFor } from "./sensorTypes";
import { ACCURACY_SETTING_KEYS, readSettings } from "./settings";

export function localeNumber(value, decimals) {
    if (typeof (value) !== "number") return value;
    if (isNaN(value)) return "-";
    let lng = navigator.language;
    if (!lng) lng = "fi-FI";
    if (decimals === undefined) return value.toLocaleString(lng);
    return value.toLocaleString(lng, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Parse a number the user's locale formatted, e.g. "1 234,56" → 1234.56.
function parseLocaleNumber(value) {
    value = value.replace(" ", "").replace("−", "-");
    const numberFormat = new Intl.NumberFormat(navigator.language);
    const parts = numberFormat.formatToParts(12345.6);
    const groupSeparator = parts.find(part => part.type === 'group').value;
    const decimalSeparator = parts.find(part => part.type === 'decimal').value;
    return value.replace(new RegExp(`\\${groupSeparator}`, 'g'), '').replace(decimalSeparator, '.');
}

export function getDisplayValue(key, value, settings) {
    try {
        if (key === "aqi" && value != null) value = Math.round(value);
        if (!ACCURACY_SETTING_KEYS[key]) return value;
        if (!settings) settings = readSettings();
        else if (typeof settings === "string") settings = JSON.parse(settings);
        if (value == null) return value;

        const resolution = displayDecimalsFor(key, settings);

        if (typeof value === "string") value = parseLocaleNumber(value);
        value = parseFloat(value).toFixed(resolution);
        value = localeNumber(+value, resolution);
    } catch (error) {
        logger.error("getDisplayValue", error);
    }
    return value;
}
