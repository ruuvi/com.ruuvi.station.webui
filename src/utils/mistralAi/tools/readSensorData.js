import NetworkApi from "../../../NetworkApi";
import { formatMeasurement, formatSensor, normalizeFields } from "../formatters";
import { loadSensors, resolveSensor } from "../sensorService";
import { clampNumber, ensureSuccess } from "../shared";

export const name = "read_sensor_data";

export const definition = {
    type: "function",
    function: {
        name,
        description: "Read latest or recent history data for one sensor. The sensor can be a MAC address, exact name, or partial name such as outdoors or sauna.",
        parameters: {
            type: "object",
            properties: {
                sensor: {
                    type: "string",
                    description: "Sensor MAC address, exact name, or partial name."
                },
                fields: {
                    type: "array",
                    description: "Optional measurement fields to return, for example temperature, humidity, pressure, battery, co2, pm25, aqi.",
                    items: { type: "string" }
                },
                latest_only: {
                    type: "boolean",
                    description: "Use true for current readings. Use false when the user asks for history, trends, min, max, or averages."
                },
                hours: {
                    type: "number",
                    description: "History window in hours when latest_only is false. Defaults to 24."
                },
                limit: {
                    type: "integer",
                    description: "Maximum number of measurements to return. Defaults to 50 and is capped at 300."
                }
            },
            required: ["sensor"],
            additionalProperties: false
        }
    }
};

export async function handler(args) {
    const sensors = await loadSensors(true);
    const sensor = resolveSensor(sensors, args.sensor);
    const latestOnly = args.latest_only !== false;
    const fields = normalizeFields(args.fields);
    const api = new NetworkApi();

    if (latestOnly) {
        const resp = await api.getLastestDataAsync(sensor.sensor);
        ensureSuccess(resp, "Failed to read latest sensor data");
        const latest = resp.data?.measurements?.[0] || sensor.measurements?.[0];
        return {
            ok: true,
            sensor: formatSensor(sensor, false),
            latest: latest ? formatMeasurement(latest, fields) : null
        };
    }

    const now = Math.floor(Date.now() / 1000);
    const hours = clampNumber(args.hours || 24, 1 / 60, 24 * 31);
    const limit = Math.round(clampNumber(args.limit || 50, 1, 300));
    const since = now - Math.round(hours * 3600);
    const resp = await api.getAsync(sensor.sensor, since, now, { mode: "mixed", limit });
    ensureSuccess(resp, "Failed to read sensor history");
    const measurements = (resp.data?.measurements || [])
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)
        .map(measurement => formatMeasurement(measurement, fields));

    return {
        ok: true,
        sensor: formatSensor(sensor, false),
        range: {
            since: new Date(since * 1000).toISOString(),
            until: new Date(now * 1000).toISOString(),
            hours
        },
        measurements
    };
}
