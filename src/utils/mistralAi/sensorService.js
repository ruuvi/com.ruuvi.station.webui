import NetworkApi from "../../NetworkApi";
import parse from "../../decoder/parser";
import pjson from "../../../package.json";
import { ensureSuccess, normalizeText } from "./shared";

export async function loadSensors(noCache) {
    const resp = await new NetworkApi().getAllSensorsAsync(noCache);
    ensureSuccess(resp, "Failed to load sensors");
    return resp.data?.sensors || [];
}

export function resolveSensor(sensors, sensorQuery) {
    const query = normalizeText(sensorQuery || "");
    if (!query) {
        if (sensors.length === 1) return sensors[0];
        throw new Error("A sensor name or MAC address is required.");
    }

    const exactMatches = sensors.filter(sensor =>
        normalizeText(sensor.sensor) === query || normalizeText(sensor.name) === query
    );
    if (exactMatches.length === 1) return exactMatches[0];

    const partialMatches = sensors.filter(sensor =>
        normalizeText(sensor.name).includes(query) || normalizeText(sensor.sensor).includes(query)
    );
    const matches = exactMatches.length ? exactMatches : partialMatches;
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
        throw new Error(`Sensor name is ambiguous. Matches: ${matches.map(sensor => sensor.name).join(", ")}`);
    }

    throw new Error(`Sensor not found: ${sensorQuery}`);
}

export async function fetchHistoryMeasurements(sensor, sinceStart, until) {
    const api = new NetworkApi();
    const paginationSize = pjson.settings.dataFetchPaginationSize;
    const offsets = Object.keys(sensor).filter(key => key.startsWith("offset"));
    const all = [];
    let nextUntil = until;
    const maxRounds = 50;

    for (let round = 0; round < maxRounds; round++) {
        if (nextUntil <= sinceStart) break;
        const resp = await api.getAsync(sensor.sensor, sinceStart, nextUntil, { mode: "mixed", limit: paginationSize });
        ensureSuccess(resp, "Failed to read sensor history");

        offsets.forEach(key => { resp.data[key] = sensor[key]; });
        const parsed = parse(resp.data);
        const batch = parsed.measurements || [];
        all.push(...batch);

        const returnedLength = batch.length;
        const oldestTs = batch.length ? batch[batch.length - 1].timestamp : null;
        const shouldContinue = parsed.nextUp || parsed.fromCache || returnedLength >= paginationSize;
        if (!shouldContinue) break;

        const newUntil = parsed.nextUp || (oldestTs !== null ? oldestTs : null);
        if (newUntil === null || newUntil >= nextUntil) break;
        nextUntil = newUntil;
    }

    return all;
}
