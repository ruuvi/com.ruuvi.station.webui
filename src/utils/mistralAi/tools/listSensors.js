import { formatSensor } from "../formatters";
import { loadSensors } from "../sensorService";

export const name = "list_sensors";

export const definition = {
    type: "function",
    function: {
        name,
        description: "List the user's Ruuvi sensors, their latest readings, and enabled alerts. Use this before answering questions that mention a sensor by name, location, or nickname.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    }
};

export async function handler() {
    const sensors = await loadSensors(true);
    return {
        ok: true,
        sensors: sensors.map(sensor => formatSensor(sensor, true))
    };
}
