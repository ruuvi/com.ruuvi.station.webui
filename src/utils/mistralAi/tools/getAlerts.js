import { formatAlert, formatSensor } from "../formatters";
import { loadSensors, resolveSensor } from "../sensorService";

export const name = "get_alerts";

export const definition = {
    type: "function",
    function: {
        name,
        description: "Read alert settings. Provide a sensor to read one sensor's alerts, or omit it to read alerts for all sensors.",
        parameters: {
            type: "object",
            properties: {
                sensor: {
                    type: "string",
                    description: "Optional sensor MAC address, exact name, or partial name."
                }
            },
            additionalProperties: false
        }
    }
};

export async function handler(args) {
    const sensors = await loadSensors(true);
    if (args.sensor) {
        const sensor = resolveSensor(sensors, args.sensor);
        return {
            ok: true,
            sensor: formatSensor(sensor, false),
            alerts: (sensor.alerts || []).map(formatAlert)
        };
    }

    return {
        ok: true,
        sensors: sensors.map(sensor => ({
            sensor: sensor.sensor,
            name: sensor.name,
            alerts: (sensor.alerts || []).map(formatAlert)
        }))
    };
}
