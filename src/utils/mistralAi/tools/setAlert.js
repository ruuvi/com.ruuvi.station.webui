import NetworkApi from "../../../NetworkApi";
import { alertTypes } from "../../../UnitHelper";
import {
    convertAlertValue,
    getFiniteAlertRange,
    normalizeAlertType,
    trimDescription,
    updateCachedAlert,
    validateAlertBounds
} from "../alertService";
import { formatAlert, formatSensor } from "../formatters";
import { loadSensors, resolveSensor } from "../sensorService";
import { ensureSuccess } from "../shared";

export const name = "set_alert";

export const definition = {
    type: "function",
    function: {
        name,
        description: "Create or update a Ruuvi alert. Alerts trigger when a value is below min or above max. For a high-only alert, use direction='above' with threshold. For a low-only alert, use direction='below' with threshold. If the user says 'notify me when the sauna is hot', use temperature, direction='above', threshold=60, unit='C', and a short description.",
        parameters: {
            type: "object",
            properties: {
                sensor: {
                    type: "string",
                    description: "Sensor MAC address, exact name, or partial name."
                },
                type: {
                    type: "string",
                    description: "Alert type.",
                    enum: alertTypes
                },
                enabled: {
                    type: "boolean",
                    description: "Whether the alert should be enabled. Defaults to true."
                },
                direction: {
                    type: "string",
                    enum: ["above", "below", "outside"],
                    description: "Use with threshold for single-threshold requests."
                },
                threshold: {
                    type: "number",
                    description: "Threshold value in the provided unit. Use with direction."
                },
                min: {
                    type: "number",
                    description: "Lower alert boundary in the provided unit."
                },
                max: {
                    type: "number",
                    description: "Upper alert boundary in the provided unit."
                },
                unit: {
                    type: "string",
                    description: "Unit for threshold/min/max, for example C, F, K, %, Pa, hPa, mmHg, inHg, V, mV, seconds, minutes, hours. Defaults to the internal unit for the alert type."
                },
                description: {
                    type: "string",
                    description: "Optional short alert title shown to the user."
                },
                delay_seconds: {
                    type: "integer",
                    description: "Optional delay before alerting, in seconds."
                }
            },
            required: ["sensor", "type"],
            additionalProperties: false
        }
    }
};

export async function handler(args) {
    const sensors = await loadSensors(true);
    const sensor = resolveSensor(sensors, args.sensor);
    const type = normalizeAlertType(args.type);
    const existing = (sensor.alerts || []).find(alert => alert.type === type);
    const range = getFiniteAlertRange(type);
    const enabled = args.enabled !== false;
    let min = existing?.min ?? range.min;
    let max = existing?.max ?? range.defaultMax;

    if (args.threshold !== undefined && args.direction) {
        const threshold = convertAlertValue(type, args.threshold, args.unit);
        if (args.direction === "above") {
            min = range.min;
            max = threshold;
        } else if (args.direction === "below") {
            min = threshold;
            max = range.max;
        } else {
            throw new Error("Use min and max for outside-range alerts.");
        }
    }

    if (args.min !== undefined) min = convertAlertValue(type, args.min, args.unit);
    if (args.max !== undefined) max = convertAlertValue(type, args.max, args.unit);
    if (type === "offline") min = 0;
    validateAlertBounds(type, min, max);

    const alert = {
        ...existing,
        sensor: sensor.sensor,
        type,
        enabled,
        min,
        max,
        description: trimDescription(args.description ?? existing?.description ?? ""),
        delay: args.delay_seconds ?? existing?.delay ?? 0
    };

    const api = new NetworkApi();
    const resp = await api.setAlertAsync(alert);
    ensureSuccess(resp, "Failed to save alert");
    api.clearAllSensorsCache();
    updateCachedAlert(sensor.sensor, alert);

    return {
        ok: true,
        sensor: formatSensor(sensor, false),
        alert: formatAlert(alert)
    };
}
