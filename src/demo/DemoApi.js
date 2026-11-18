import storage from "../utils/storage";
import { demoReadings } from "./DemoReadings";
import { DEMO_SENSORS, demoDisplaySettings } from "./DemoSensors";

export const DEMO_USER = { email: "demo@example.com", accessToken: "local-demo" };
const DAY = 86400;
const PLAN = {
    subscriptionName: "Demo",
    maxHistoryDays: 90,
    maxSharesPerSensor: 10,
    maxShares: 30,
    pdfExportAllowed: true,
    endTime: 0,
};
const STATE_KEY = "api-state-v1";
const STATE_VERSION = 5;
const success = (data = {}) => ({ result: "success", data });
const failure = (code = "ER_FORBIDDEN") => ({ result: "error", code });

function makeSensor(sensor, name, profile, air = false) {
    const preset = DEMO_SENSORS[profile];
    return {
        sensor, name, profile, air,
        owner: DEMO_USER.email,
        canShare: true,
        sharedTo: [],
        public: false,
        subscription: { ...PLAN },
        offsetTemperature: 0,
        offsetHumidity: 0,
        offsetPressure: 0,
        settings: { description: preset.description, ...demoDisplaySettings(profile) },
        alerts: [{ sensor, type: "temperature", enabled: true, min: preset.range[0], max: preset.range[1], description: "Temperature range", delay: 0 }],
    };
}

function readState() {
    const saved = storage.getItem(STATE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        const version = state.version || 1;
        if (version < STATE_VERSION) {
            // Each version only adds newly introduced samples, so intentionally
            // removed sensors stay removed. Allocate around user-claimed IDs.
            const firstNewProfile = { 1: 4, 2: 5, 3: 20, 4: 22 }[version];
            for (let profile = firstNewProfile; profile < DEMO_SENSORS.length; profile++) {
                let suffix = profile + 1;
                while (state.sensors.some(sensor => sensor.sensor === sampleId(suffix))) suffix++;
                state.sensors.push(makeSample(profile, sampleId(suffix)));
            }
            if (version < 3) {
                for (const sensor of state.sensors) {
                    if (sensor.settings.defaultDisplayOrder === undefined && sensor.settings.displayOrder === undefined) {
                        Object.assign(sensor.settings, demoDisplaySettings(sensor.profile));
                    }
                }
            }
            if (version === 4) {
                for (const sensor of state.sensors) {
                    if (sensor.profile === 20 && sensor.name === "RuuviTag (all fields)") sensor.name = "RuuviTag";
                    if (sensor.profile === 21 && sensor.name === "Ruuvi Air (all fields)") sensor.name = "Ruuvi Air";
                }
            }
            state.version = STATE_VERSION;
            storage.setItem(STATE_KEY, JSON.stringify(state));
        }
        return state;
    }
    const sensors = DEMO_SENSORS.map((_, profile) => makeSample(profile));
    sensors[0].sharedTo = ["household@example.com"];
    sensors[2].owner = "neighbor@example.com";
    sensors[2].canShare = false;
    sensors[3].alerts[0] = { ...sensors[3].alerts[0], min: 0, max: 5, description: "Keep food cool" };
    return { version: STATE_VERSION, sensors, settings: {}, consent: false };
}

function sampleId(suffix) {
    return `D0:DE:00:00:${(suffix >> 8).toString(16).padStart(2, "0")}:${(suffix & 255).toString(16).padStart(2, "0")}`.toUpperCase();
}

function makeSample(profile, id = sampleId(profile + 1)) {
    const { name, air } = DEMO_SENSORS[profile];
    return makeSensor(id, name, profile, air);
}

// Encode real Ruuvi packets so graphs, offsets, unit conversions, statistics,
// and exports use the same decoder and rendering pipeline as live readings.
function measurement(sensor, timestamp) {
    const readings = demoReadings(sensor.profile, timestamp);
    const { temperature, humidity, pressure } = readings;
    const bytes = new Uint8Array(sensor.air ? 44 : 28);
    bytes.set([bytes.length - 1, 0xff, 0x99, 0x04, sensor.air ? 0xe1 : 0x05]);
    const view = new DataView(bytes.buffer);
    const u16 = (offset, value) => view.setUint16(offset, Math.round(value));
    view.setInt16(5, Math.round(temperature * 200));
    u16(7, humidity * 400);
    u16(9, pressure - 50000);
    if (sensor.air) {
        [readings.pm1, readings.pm25, readings.pm4, readings.pm10]
            .forEach((value, index) => u16(11 + index * 2, value * 10));
        u16(19, readings.co2);
        const voc = Math.round(readings.voc);
        const nox = Math.round(readings.nox);
        bytes[21] = voc >> 1;
        bytes[22] = nox >> 1;
        bytes[32] = ((voc & 1) << 6) | ((nox & 1) << 7);
        const light = Math.round(readings.light * 100);
        bytes[23] = light >> 16;
        bytes[24] = light >> 8;
        bytes[25] = light;
        bytes[26] = Math.round((readings.sound - 18) / 0.4);
        bytes[27] = Math.round((readings.soundAvg - 18) / 0.4);
        bytes[28] = Math.round((readings.soundMax - 18) / 0.4);
        const sequence = Math.floor(timestamp / 60) % 0xffffff;
        bytes[29] = sequence >> 16;
        bytes[30] = sequence >> 8;
        bytes[31] = sequence;
    } else {
        u16(11, 12);
        u16(13, 8);
        u16(15, 1000);
        u16(17, ((2980 - 1600) << 5) | 22);
        bytes[19] = Math.floor(timestamp / DAY) % 255;
        u16(20, Math.floor(timestamp / 60) % 65535);
    }
    bytes.set(sensor.sensor.split(":").map(byte => parseInt(byte, 16)), sensor.air ? 38 : 22);
    return {
        timestamp,
        rssi: readings.rssi,
        data: Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase(),
    };
}

function metadata(sensor) {
    const { profile: _profile, air: _air, ...data } = sensor;
    return data;
}

export function demoHistory(id, since, until, { mode = "mixed", limit = 100000, sort = "desc" } = {}) {
    const sensor = readState().sensors.find(item => item.sensor === id);
    if (!sensor) return failure("ER_SENSOR_NOT_FOUND");
    const now = Math.floor(Date.now() / 1000);
    const start = Math.max(Number(since) || 0, now - PLAN.maxHistoryDays * DAY);
    const end = Math.min(until == null ? now + 1 : Number(until), now + 1);
    const step = mode === "sparse" ? 900 : 300;
    const count = Math.min(Math.max(Math.floor(Number(limit)) || 1, 1), 100000);
    const measurements = [];
    // `until` is exclusive: callers paginate using the oldest returned timestamp.
    if (sort === "asc") {
        for (let ts = Math.ceil(start / step) * step; ts < end && measurements.length < count; ts += step) {
            measurements.push(measurement(sensor, ts));
        }
    } else {
        for (let ts = Math.ceil(end / step) * step - step; ts >= start && measurements.length < count; ts -= step) {
            measurements.push(measurement(sensor, ts));
        }
    }
    return success({ ...metadata(sensor), measurements });
}

export function demoRequest(path, { method = "GET", body = {}, signal } = {}) {
    if (signal?.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");
    const url = new URL(path, "https://demo.invalid");
    if (url.pathname === "/get") {
        const query = url.searchParams;
        return demoHistory(query.get("sensor"), query.get("since"), query.get("until"), {
            mode: query.get("mode") || "mixed",
            limit: query.get("limit") || 100000,
            sort: query.get("sort") || "desc",
        });
    }
    const state = readState();
    const sensor = state.sensors.find(item => item.sensor === body.sensor);
    const save = (data = {}) => {
        storage.setItem(STATE_KEY, JSON.stringify(state));
        return success(data);
    };
    switch (`${method} ${url.pathname}`) {
        case "GET /sensors-dense":
        case "GET /user":
            return success({ email: DEMO_USER.email, sensors: state.sensors.map(item => ({
                ...metadata(item), measurements: [measurement(item, Math.floor(Date.now() / 60000) * 60)],
            })) });
        case "GET /subscription":
            return success({ subscriptions: [{ ...PLAN }] });
        case "GET /settings":
            return success({ settings: state.settings });
        case "POST /settings":
            state.settings[body.name] = body.value;
            return save({ settings: state.settings });
        case "GET /alerts":
            return success({ alerts: state.sensors.filter(item => !url.searchParams.has("sensor") || item.sensor === url.searchParams.get("sensor")).flatMap(item => item.alerts) });
        case "POST /alerts":
            if (!sensor) return failure("ER_SENSOR_NOT_FOUND");
            sensor.alerts = [...sensor.alerts.filter(alert => alert.type !== body.type), { ...body }];
            return save();
        case "POST /sensor-settings":
            if (!sensor) return failure("ER_SENSOR_NOT_FOUND");
            if (Array.isArray(body.type)) {
                body.type.forEach((type, index) => { sensor.settings[type] = body.value[index]; });
            } else {
                sensor.settings[body.type] = body.value;
            }
            return save();
        case "POST /update":
            if (!sensor) return failure("ER_SENSOR_NOT_FOUND");
            for (const key of ["name", "public", "picture", "offsetTemperature", "offsetHumidity", "offsetPressure"]) {
                if (key in body) sensor[key] = body[key];
            }
            return save();
        case "POST /share":
            if (!sensor) return failure("ER_SENSOR_NOT_FOUND");
            if (!sensor.sharedTo.includes(body.user)) sensor.sharedTo.push(body.user);
            return save({ invited: false });
        case "POST /unshare":
            if (!sensor) return failure("ER_SENSOR_NOT_FOUND");
            sensor.sharedTo = sensor.sharedTo.filter(email => email !== body.user);
            return save();
        case "POST /unclaim":
            state.sensors = state.sensors.filter(item => item.sensor !== body.sensor);
            return save();
        case "POST /claim":
            if (sensor) return failure("ER_CONFLICT");
            if (!/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(body.sensor)) return failure("ER_INVALID_MAC_ADDRESS");
            state.sensors.push(makeSensor(body.sensor, body.name, 0));
            return save();
        case "POST /upload":
            return sensor ? success({ uploadURL: `demo:${sensor.sensor}` }) : failure("ER_SENSOR_NOT_FOUND");
        case "GET /marketing-consent":
            return success({ consent: state.consent, status: state.consent ? "subscribed" : "unsubscribed" });
        case "POST /marketing-consent":
            state.consent = body.consent;
            return save({ consent: state.consent, status: state.consent ? "subscribed" : "unsubscribed" });
        case "GET /sessions":
            return success({ sessions: [{ id: "demo", current: true, createdAt: Math.floor(Date.now() / 1000), lastAccessed: Math.floor(Date.now() / 1000) }] });
        case "DELETE /sessions":
            return success();
        default:
            // Unsupported account actions must never fall through to the live API.
            return failure();
    }
}

export function demoUpload(url, file) {
    const response = demoRequest("/update", { method: "POST", body: { sensor: url.replace(/^demo:/, ""), picture: file } });
    if (response.result !== "success") throw new Error("Demo sensor not found");
}
