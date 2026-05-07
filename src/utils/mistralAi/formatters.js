import NetworkApi from "../../NetworkApi";
import { getUnitHelper, round } from "../../UnitHelper";
import { DEFAULT_READING_FIELDS, FIELD_ALIASES } from "./constants";

export function getFieldUnitHelper(key) {
    const helperKey = key === "rssi" ? "signal" : key;
    return getUnitHelper(helperKey);
}

export function formatDisplayValue(key, value, parsed = {}) {
    const unitHelper = getFieldUnitHelper(key);
    let displayValue = value;

    if (key === "humidity") {
        displayValue = unitHelper.value(value, parsed.temperature);
    } else if (unitHelper.value) {
        displayValue = unitHelper.value(value);
    }

    if (typeof displayValue === "number") {
        displayValue = round(displayValue, unitHelper.decimals ?? 2);
    }

    return {
        display: displayValue,
        unit: typeof unitHelper.unit === "string" ? unitHelper.unit : ""
    };
}

export function formatValue(key, value, parsed) {
    const { display, unit } = formatDisplayValue(key, value, parsed);
    return {
        raw: value,
        display,
        unit
    };
}

export function normalizeFields(fields) {
    if (!Array.isArray(fields)) return null;
    return fields.map(normalizeField);
}

export function normalizeField(field) {
    const key = String(field || "").toLowerCase().replace(/[\s-]/g, "_");
    return FIELD_ALIASES[key] || field;
}

export function formatMeasurement(measurement, fields) {
    const parsed = measurement.parsed || {};
    const selectedFields = fields?.length ? fields : DEFAULT_READING_FIELDS;
    const values = {};

    selectedFields.forEach(field => {
        const normalizedField = normalizeField(field);
        if (parsed[normalizedField] !== undefined) {
            values[normalizedField] = formatValue(normalizedField, parsed[normalizedField], parsed);
        }
    });

    return {
        timestamp: measurement.timestamp,
        time: new Date(measurement.timestamp * 1000).toISOString(),
        values
    };
}

export function formatAlert(alert) {
    return {
        type: alert.type,
        enabled: !!alert.enabled,
        min: alert.min,
        max: alert.max,
        description: alert.description || "",
        delaySeconds: alert.delay || 0,
        triggered: !!alert.triggered
    };
}

export function formatSensor(sensor, includeLatest) {
    const latest = sensor.measurements?.[0];
    const user = new NetworkApi().getUser();
    const formatted = {
        sensor: sensor.sensor,
        name: sensor.name,
        owner: sensor.owner,
        shared: user?.email ? user.email !== sensor.owner : undefined,
        alertsEnabled: (sensor.alerts || []).filter(alert => alert.enabled).map(formatAlert)
    };

    if (includeLatest && latest) {
        formatted.latest = formatMeasurement(latest);
    }

    return formatted;
}
