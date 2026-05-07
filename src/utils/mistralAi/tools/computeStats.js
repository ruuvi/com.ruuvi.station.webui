import { formatDisplayValue, formatSensor, normalizeField, normalizeFields } from "../formatters";
import { fetchHistoryMeasurements, loadSensors, resolveSensor } from "../sensorService";
import { clampNumber } from "../shared";

export const name = "compute_stats";

export const definition = {
    type: "function",
    function: {
        name,
        description: "Compute min, max, average, median, and sample count for one sensor's measurements over a time window. Use this for questions about highs, lows, averages, or trends instead of read_sensor_data with latest_only=false.",
        parameters: {
            type: "object",
            properties: {
                sensor: {
                    type: "string",
                    description: "Sensor MAC address, exact name, or partial name."
                },
                fields: {
                    type: "array",
                    description: "Measurement fields to summarize, for example temperature, humidity, pressure, co2, pm25. Defaults to temperature and humidity.",
                    items: { type: "string" }
                },
                hours: {
                    type: "number",
                    description: "History window in hours. Defaults to 24. Capped at 24*31."
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
    const fields = (normalizeFields(args.fields) || ["temperature", "humidity"]).filter(Boolean);
    const hours = clampNumber(args.hours || 24, 1 / 60, 24 * 31);
    const now = Math.floor(Date.now() / 1000);
    const sinceStart = now - Math.round(hours * 3600);

    const measurements = await fetchHistoryMeasurements(sensor, sinceStart, now);
    const stats = {};
    for (const field of fields) {
        const key = normalizeField(field);
        const rawValues = measurements
            .map(measurement => measurement.parsed?.[key])
            .filter(value => typeof value === "number" && Number.isFinite(value));
        if (!rawValues.length) {
            stats[key] = { count: 0 };
            continue;
        }

        const toDisplay = value => formatDisplayValue(key, value, { temperature: 20 });
        const sorted = rawValues.slice().sort((a, b) => a - b);
        const sum = rawValues.reduce((accumulator, value) => accumulator + value, 0);
        const average = sum / rawValues.length;
        const median = sorted.length % 2
            ? sorted[(sorted.length - 1) / 2]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

        stats[key] = {
            count: rawValues.length,
            min: toDisplay(sorted[0]).display,
            max: toDisplay(sorted[sorted.length - 1]).display,
            average: toDisplay(average).display,
            median: toDisplay(median).display,
            unit: toDisplay(rawValues[0]).unit
        };
    }

    return {
        ok: true,
        sensor: formatSensor(sensor, false),
        range: {
            since: new Date(sinceStart * 1000).toISOString(),
            until: new Date(now * 1000).toISOString(),
            hours
        },
        stats
    };
}
