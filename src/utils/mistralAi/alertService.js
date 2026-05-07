import pjson from "../../../package.json";
import { alertTypes, getAlertRange, round } from "../../UnitHelper";
import { ALERT_TYPE_ALIASES } from "./constants";

export function normalizeAlertType(type) {
    const key = String(type || "");
    const normalizedKey = key.replace(/[\s-]/g, "_");
    const lowerKey = normalizedKey.toLowerCase();
    const normalized = ALERT_TYPE_ALIASES[key]
        || ALERT_TYPE_ALIASES[normalizedKey]
        || ALERT_TYPE_ALIASES[lowerKey]
        || alertTypes.find(alertType => alertType.toLowerCase() === lowerKey)
        || key;
    if (!alertTypes.includes(normalized)) {
        throw new Error(`Unsupported alert type: ${type}`);
    }
    return normalized;
}

export function convertAlertValue(type, value, unit) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        throw new Error(`Invalid alert value: ${value}`);
    }

    const normalizedUnit = String(unit || "").toLowerCase().replace(/\u00b0/g, "").trim();
    if (type === "temperature") {
        if (["f", "fahrenheit"].includes(normalizedUnit)) return round((numericValue - 32) / 1.8, 2);
        if (["k", "kelvin"].includes(normalizedUnit)) return round(numericValue - 273.15, 2);
        return numericValue;
    }

    if (type === "pressure") {
        if (normalizedUnit === "hpa") return round(numericValue * 100, 2);
        if (normalizedUnit === "mmhg") return round(numericValue * 133.322368, 2);
        if (normalizedUnit === "inhg") return round(numericValue * 3386.388666, 2);
        return numericValue;
    }

    if (type === "battery" && normalizedUnit === "mv") {
        return round(numericValue / 1000, 3);
    }

    if (type === "offline") {
        if (["minute", "minutes", "min"].includes(normalizedUnit)) return Math.round(numericValue * 60);
        if (["hour", "hours", "h"].includes(normalizedUnit)) return Math.round(numericValue * 3600);
    }

    return numericValue;
}

export function getFiniteAlertRange(type) {
    if (type === "offline") {
        return { min: 0, max: 31 * 24 * 3600, defaultMax: 900 };
    }

    const range = getAlertRange(type);
    const min = range.extended?.min ?? range.min;
    const max = range.extended?.max ?? range.max;
    const finiteMax = Number.isFinite(max) ? max : 100;
    return {
        min: Number.isFinite(min) ? min : 0,
        max: finiteMax,
        defaultMax: finiteMax
    };
}

export function validateAlertBounds(type, min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new Error("Alert min and max must be finite numbers.");
    }
    if (min >= max) {
        throw new Error("Alert min must be lower than max.");
    }

    const range = getFiniteAlertRange(type);
    if (type === "offline") {
        if (min !== 0 || max < 120 || max > range.max) {
            throw new Error(`Offline alert delay must be between 120 and ${range.max} seconds.`);
        }
        return;
    }

    if (min < range.min || max > range.max) {
        throw new Error(`Alert bounds for ${type} must be between ${range.min} and ${range.max}.`);
    }
}

export function trimDescription(description) {
    return String(description || "").substring(0, pjson.settings.alertDescriptionMaxLength);
}

export function updateCachedAlert(sensorId, alert) {
    const cached = localStorage.getItem("sensors");
    if (!cached) return;

    const sensors = JSON.parse(cached);
    const sensor = sensors.find(item => item.sensor === sensorId);
    if (!sensor) return;

    sensor.alerts = sensor.alerts || [];
    const index = sensor.alerts.findIndex(item => item.type === alert.type);
    if (index === -1) {
        sensor.alerts.push(alert);
    } else {
        sensor.alerts[index] = alert;
    }
    localStorage.setItem("sensors", JSON.stringify(sensors));
}
