import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import NetworkApi from "../NetworkApi";
import PublicSensorApi from "../PublicSensorApi";
import cache from "../DataCache";
import parse from "../decoder/parser";
import decoder from "../decoder/decode";
import Store from "../Store";
import storage from "../utils/storage";
import { readSettings } from "../units/settings";
import { appPath, isDemoRoute, isPublicRoute, publicPathPrefix } from "../utils/env";
import { getSensorMainFields } from "../utils/sensorHelper";
import { ORDERED_VISIBILITY_CODES, visibilityFromCloudToWeb } from "../utils/cloudTranslator";
import { DEMO_SENSORS } from "./DemoSensors";

const NOW = 1791115200;
const DAY = 86400;
const SENSOR = "D0:DE:00:00:00:01";
let originalStorage;

beforeEach(() => {
    window.history.replaceState(null, "", "/demo");
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("user", JSON.stringify({ email: "real@example.com", accessToken: "real-token" }));
    localStorage.setItem("staging_user", "real-staging-token");
    localStorage.setItem("settings", JSON.stringify({ UNIT_TEMPERATURE: "F" }));
    localStorage.setItem("sensors", "real-sensor-cache");
    localStorage.setItem("env", "staging");
    originalStorage = { ...localStorage };
    vi.spyOn(Date, "now").mockReturnValue(NOW * 1000);
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Demo attempted network access"); }));
});

afterEach(() => {
    expect(fetch).not.toHaveBeenCalled();
    expect({ ...localStorage }).toEqual(originalStorage);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
});

describe("demo API integration", () => {
    it("shows use-case-specific fields that exist in each decoded sensor packet", async () => {
        const sensors = (await new NetworkApi().getAllSensorsAsync()).data.sensors;
        expect(sensors).toHaveLength(22);
        expect(new Set(sensors.map(sensor => sensor.sensor)).size).toBe(sensors.length);
        for (const preset of DEMO_SENSORS) {
            const sensor = sensors.find(item => item.name === preset.name);
            expect(sensor.settings.defaultDisplayOrder).toBe("false");
            expect(getSensorMainFields(sensor)).toEqual(preset.fields.map(visibilityFromCloudToWeb));
        }
        const firstField = name => getSensorMainFields(sensors.find(sensor => sensor.name === name))[0][0];
        expect(firstField("Freezer")).toBe("temperature");
        expect(firstField("Bathroom")).toBe("humidity");
        expect(firstField("Home office")).toBe("co2");
        expect(firstField("Kitchen")).toBe("pm25");
        expect(new Set(sensors.map(sensor => sensor.settings.displayOrder)).size).toBeGreaterThan(10);
    });

    it.each([
        ["RuuviTag", 5],
        ["Ruuvi Air", "e1"],
    ])("shows every selectable field decoded for %s", async (name, format) => {
        const sensors = (await new NetworkApi().getAllSensorsAsync()).data.sensors;
        const sensor = sensors.find(item => item.name === name);
        const reading = sensor.measurements[0].parsed;
        expect(reading.dataFormat).toBe(format);
        const available = ORDERED_VISIBILITY_CODES.map(visibilityFromCloudToWeb)
            .filter(([type]) => Number.isFinite(reading[type]));
        expect(getSensorMainFields(sensor)).toEqual(available);
    });

    it("loads decoded sample sensors without signing in or touching cloud caches", async () => {
        const lookup = vi.spyOn(cache, "getClosestSegment");
        const api = new NetworkApi();
        expect(api.getUser().email).toBe("demo@example.com");
        expect(api.isStaging()).toBe(false);
        expect(Store.getDashboardCardType()).toBe("graph_view");
        const { data } = await api.getAllSensorsAsync();
        expect(data.sensors).toHaveLength(DEMO_SENSORS.length);
        for (const sensor of data.sensors) {
            expect(sensor.measurements).toHaveLength(1);
            expect(sensor.measurements[0].parsed.temperature).toBeTypeOf("number");
            expect(sensor.measurements[0].parsed.mac).toBe(sensor.sensor);
            expect(sensor.measurements[0].parsed.humidity).toBeGreaterThan(0);
            expect(sensor.subscription.maxHistoryDays).toBe(90);
        }
        const livingRoom = data.sensors.find(sensor => sensor.sensor === SENSOR);
        expect(livingRoom.measurements[0].parsed.co2).toBeGreaterThan(400);
        expect(livingRoom.measurements[0].parsed.aqi).toBeTypeOf("number");
        expect((await api.getSubscription()).data.subscriptions[0].pdfExportAllowed).toBe(true);
        expect(await api.getBanners()).toEqual([]);
        await api.getAsync(SENSOR, NOW - DAY, NOW);
        expect(lookup).not.toHaveBeenCalled();
    });

    it("returns repeatable, varying history for custom ranges and paginates without duplicates", async () => {
        const api = new NetworkApi();
        const from = NOW - DAY * 7;
        const first = await api.getAsync(SENSOR, from, NOW, { limit: 1500 });
        const second = await api.getAsync(SENSOR, from, first.data.measurements.at(-1).timestamp, { limit: 1500 });
        const all = [...first.data.measurements, ...second.data.measurements];
        expect(first.data.measurements).toHaveLength(1500);
        expect(second.data.measurements.length).toBeLessThan(1500);
        expect(all).toHaveLength(7 * 24 * 12);
        expect(new Set(all.map(item => item.timestamp)).size).toBe(all.length);
        expect(all.every(item => item.timestamp >= from && item.timestamp < NOW)).toBe(true);
        expect(all.at(-1).timestamp).toBe(from);
        expect(first).toEqual(await api.getAsync(SENSOR, from, NOW, { limit: 1500 }));
        expect(new Set(all.map(item => decoder(item.data).temperature)).size).toBeGreaterThan(20);
        expect(parse(first.data).measurements.every(item => Number.isFinite(item.parsed.temperature))).toBe(true);
    });

    it("supports sparse history, ascending exports, and empty ranges outside retention", async () => {
        const api = new NetworkApi();
        const sparse = await api.getAsync(SENSOR, NOW - DAY, NOW, { mode: "sparse" });
        expect(sparse.data.measurements).toHaveLength(96);
        const ascending = await api.getAsync(SENSOR, NOW - DAY, NOW, { sort: "asc", limit: 3 });
        expect(ascending.data.measurements.map(item => item.timestamp)).toEqual([NOW - DAY, NOW - DAY + 300, NOW - DAY + 600]);
        const old = await api.getAsync(SENSOR, NOW - DAY * 100, NOW - DAY * 91);
        expect(old.data.measurements).toEqual([]);
        const future = await api.getAsync(SENSOR, NOW + DAY, NOW + DAY * 2);
        expect(future.data.measurements).toEqual([]);
    });

    it("uses identical packets for live readings and overlapping history at different resolutions", async () => {
        const api = new NetworkApi();
        const live = await api.request("/sensors-dense");
        for (const sensor of live.data.sensors) {
            const dense = await api.getAsync(sensor.sensor, NOW - DAY, NOW + 1);
            const sparse = await api.getAsync(sensor.sensor, NOW - DAY, NOW + 1, { mode: "sparse", sort: "asc" });
            const byTime = new Map(dense.data.measurements.map(item => [item.timestamp, item]));
            expect(byTime.get(NOW)).toEqual(sensor.measurements[0]);
            for (const item of sparse.data.measurements) expect(item).toEqual(byTime.get(item.timestamp));
        }
    });

    it("adds the sauna to existing sessions without losing edits or restoring it after removal", async () => {
        const api = new NetworkApi();
        await api.updateSensorSetting(SENSOR, "description", "Keep my notes");
        const legacy = JSON.parse(storage.getItem("api-state-v1"));
        delete legacy.version;
        legacy.sensors = legacy.sensors.filter(sensor => sensor.profile < 4);
        // A previously claimed sensor may already use the new sample's address.
        legacy.sensors.push({ ...legacy.sensors[1], sensor: "D0:DE:00:00:00:05", name: "My sensor" });
        storage.setItem("api-state-v1", JSON.stringify(legacy));
        const sensors = (await api.getAllSensorsAsync()).data.sensors;
        const sauna = sensors.find(sensor => sensor.name === "Sauna");
        expect(sauna).toBeDefined();
        expect(new Set(sensors.map(sensor => sensor.sensor)).size).toBe(sensors.length);
        expect(sensors.find(sensor => sensor.sensor === SENSOR).settings.description).toBe("Keep my notes");
        expect(sensors.find(sensor => sensor.sensor === "D0:DE:00:00:00:05").name).toBe("My sensor");
        const history = await api.getAsync(sauna.sensor, NOW - 7 * DAY, NOW, { limit: 3000 });
        expect(Math.max(...history.data.measurements.map(item => decoder(item.data).temperature))).toBeGreaterThan(70);
        await new Promise(resolve => api.unclaim(sauna.sensor, true, resolve));
        expect((await api.getAllSensorsAsync()).data.sensors.some(sensor => sensor.name === "Sauna")).toBe(false);
    });

    it("upgrades a five-sensor session once while preserving custom visibility and removed sensors", async () => {
        const api = new NetworkApi();
        await api.updateSensorSetting(SENSOR, ["defaultDisplayOrder", "displayOrder"], ["false", '["TEMPERATURE_F"]']);
        const legacy = JSON.parse(storage.getItem("api-state-v1"));
        legacy.version = 2;
        legacy.sensors = legacy.sensors.filter(sensor => sensor.profile < 4); // Sauna was removed.
        delete legacy.sensors[1].settings.defaultDisplayOrder;
        delete legacy.sensors[1].settings.displayOrder;
        legacy.sensors[2].settings.defaultDisplayOrder = "true";
        storage.setItem("api-state-v1", JSON.stringify(legacy));
        const sensors = (await api.getAllSensorsAsync()).data.sensors;
        expect(sensors).toHaveLength(DEMO_SENSORS.length - 1);
        expect(sensors.some(sensor => sensor.name === "Sauna")).toBe(false);
        expect(sensors.find(sensor => sensor.sensor === SENSOR).settings.displayOrder).toBe('["TEMPERATURE_F"]');
        expect(sensors.find(sensor => sensor.name === "Bedroom").settings.displayOrder).toBe('["TEMPERATURE_C","HUMIDITY_0"]');
        expect(sensors.find(sensor => sensor.name === "Garden").settings.defaultDisplayOrder).toBe("true");
        const freezer = sensors.find(sensor => sensor.name === "Freezer");
        await new Promise(resolve => api.unclaim(freezer.sensor, true, resolve));
        expect((await api.getAllSensorsAsync()).data.sensors).toHaveLength(DEMO_SENSORS.length - 2);
        expect((await api.getAllSensorsAsync()).data.sensors.some(sensor => sensor.name === "Freezer")).toBe(false);
    });

    it("adds only the two full-field samples to a version 3 session", async () => {
        const api = new NetworkApi();
        await api.updateSensorSetting(SENSOR, "description", "Keep my notes");
        const legacy = JSON.parse(storage.getItem("api-state-v1"));
        legacy.version = 3;
        legacy.sensors = legacy.sensors.filter(sensor => sensor.profile < 19); // Meeting room was removed.
        storage.setItem("api-state-v1", JSON.stringify(legacy));
        const sensors = (await api.getAllSensorsAsync()).data.sensors;
        expect(sensors.map(sensor => sensor.name).sort()).toEqual([
            ...legacy.sensors.map(sensor => sensor.name), "RuuviTag", "Ruuvi Air",
        ].sort());
        expect(sensors.find(sensor => sensor.sensor === SENSOR).settings.description).toBe("Keep my notes");
        expect((await api.getAllSensorsAsync()).data.sensors).toEqual(sensors);
    });

    it.each([
        ["RuuviTag (all fields)", "RuuviTag"],
        ["Porch", "Porch"],
    ])("migrates version 4 demo names when the tag is named %s", async (oldName, expectedName) => {
        const api = new NetworkApi();
        await api.updateSensorSetting(SENSOR, "description", "Keep my notes");
        const legacy = JSON.parse(storage.getItem("api-state-v1"));
        legacy.version = 4;
        const tag = legacy.sensors.find(sensor => sensor.profile === 20);
        const air = legacy.sensors.find(sensor => sensor.profile === 21);
        tag.name = oldName;
        air.name = "Ruuvi Air (all fields)";
        storage.setItem("api-state-v1", JSON.stringify(legacy));

        const sensors = (await api.getAllSensorsAsync()).data.sensors;
        expect(sensors).toHaveLength(legacy.sensors.length);
        expect(sensors.find(sensor => sensor.sensor === tag.sensor).name).toBe(expectedName);
        expect(sensors.find(sensor => sensor.sensor === air.sensor).name).toBe("Ruuvi Air");
    });

    it("persists sensor edits, alerts, notes, uploads, and simulated shares across API instances", async () => {
        const api = new NetworkApi();
        await new Promise(resolve => api.updateSensorData(SENSOR, { name: "My demo room", offsetTemperature: 2 }, resolve));
        await api.updateSensorSetting(SENSOR, ["description", "defaultDisplayOrder", "displayOrder"], ["Demo notes", "false", '["temperature"]']);
        await new Promise(resolve => api.setAlert({ sensor: SENSOR, type: "temperature", enabled: true, min: 18, max: 25 }, resolve));
        await api.shareAsync(SENSOR, "friend@example.com");
        const upload = await new Promise(resolve => api.prepareUpload(SENSOR, "image/jpeg", resolve));
        await new Promise((resolve, reject) => api.uploadImage(upload.data.uploadURL, "image/jpeg", "data:image/jpeg;base64,ZGVtbw==", resolve, reject));
        const sensors = (await new NetworkApi().getAllSensorsAsync()).data.sensors;
        const sensor = sensors.find(item => item.sensor === SENSOR);
        expect(sensor.name).toBe("My demo room");
        expect(sensor.settings.description).toBe("Demo notes");
        expect(sensor.settings.defaultDisplayOrder).toBe("false");
        expect(sensor.settings.displayOrder).toBe('["temperature"]');
        expect(sensor.alerts[0].max).toBe(25);
        expect(sensor.sharedTo).toContain("friend@example.com");
        expect(sensor.picture).toBe("data:image/jpeg;base64,ZGVtbw==");
        const rawTemperature = decoder(sensor.measurements[0].data).temperature;
        expect(sensor.measurements[0].parsed.temperature).toBeCloseTo(rawTemperature + 2, 1);
        // Reading/decoding a response must not mutate the next API result.
        expect((await api.getAllSensorsAsync()).data.sensors).toEqual(sensors);
    });

    it("isolates unit preferences and resets only demo data", async () => {
        const api = new NetworkApi();
        expect(readSettings()).toEqual({});
        await new Promise(resolve => api.setSetting("UNIT_TEMPERATURE", "K", resolve));
        const result = await new Promise(resolve => api.getSettings(resolve));
        storage.setItem("settings", JSON.stringify(result.data.settings));
        Store.setDashboardCardType("image_view");
        expect(readSettings().UNIT_TEMPERATURE).toBe("K");
        expect(Store.getDashboardCardType()).toBe("image_view");
        sessionStorage.setItem("unrelated", "keep");
        storage.clear();
        expect(sessionStorage.getItem("unrelated")).toBe("keep");
        expect(Store.getDashboardCardType()).toBe("graph_view");
        expect(readSettings()).toEqual({});
    });

    it("adds and removes local sensors, leaving indexed data alone", async () => {
        const remove = vi.spyOn(cache, "removeData");
        const api = new NetworkApi();
        const id = "D0:DE:00:00:00:AA";
        expect((await api.claim(id, "New demo sensor")).result).toBe("success");
        expect((await api.getAllSensorsAsync()).data.sensors).toHaveLength(DEMO_SENSORS.length + 1);
        expect((await api.getAsync(id, NOW - DAY, NOW)).data.measurements.length).toBeGreaterThan(1);
        await new Promise(resolve => api.unclaim(id, true, resolve));
        expect((await api.getAllSensorsAsync()).data.sensors).toHaveLength(DEMO_SENSORS.length);
        expect((await api.getAsync(id, NOW - DAY, NOW)).code).toBe("ER_SENSOR_NOT_FOUND");
        expect(remove).not.toHaveBeenCalled();
    });

    it("rejects cancellation and unsupported account actions without falling through to fetch", async () => {
        const api = new NetworkApi();
        const controller = new AbortController();
        controller.abort();
        await expect(api.getAsync(SENSOR, NOW - DAY, NOW, {}, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
        await expect(api.request("/user", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
        expect((await api.requestDelete("real@example.com")).result).toBe("error");
        expect((await api.claimSubscription("REAL-CODE")).result).toBe("error");
        expect((await api.request("/future-endpoint")).result).toBe("error");
        api.setUser({ email: "replacement@example.com" });
        api.removeToken();
        api.setEnv("production");
        expect(api.getUser().email).toBe("demo@example.com");
    });

    it("keeps deep links and public sensor URLs in the demo", async () => {
        expect(isDemoRoute("/demo")).toBe(true);
        expect(isDemoRoute("/demo/compare")).toBe(true);
        expect(isDemoRoute("/demonstration")).toBe(false);
        expect(isDemoRoute("/public/demo")).toBe(false);
        expect(appPath("/compare")).toBe("/demo/compare");
        expect(publicPathPrefix(false)).toBe("/demo/public");
        window.history.replaceState(null, "", `/demo/public/${SENSOR}`);
        expect(isPublicRoute()).toBe(true);
        const publicApi = new PublicSensorApi();
        const result = await publicApi.getLatest(SENSOR);
        expect(result.data.measurements).toHaveLength(1);
        const history = await publicApi.getHistory(SENSOR, NOW - DAY, NOW);
        expect(history.data.measurements).toHaveLength(24 * 12);
        window.history.replaceState(null, "", "/");
        expect(appPath("/compare")).toBe("/compare");
        expect(new NetworkApi().getUserKey()).toBe("staging_user");
    });

    it("bypasses the HTML sign-in redirect and cookie import on demo deep links", () => {
        window.history.replaceState(null, "", "/demo/compare");
        document.head.innerHTML = '<meta name="theme-color" content="#000000">';
        document.cookie = 'station_user={"email":"cookie@example.com","accessToken":"cookie-token"}';
        const beforeCookie = document.cookie;
        const html = readFileSync("index.html", "utf8");
        const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
        new Function(inlineScript)();
        expect(document.cookie).toBe(beforeCookie);
        expect(window.location.pathname).toBe("/demo/compare");
        document.cookie = "station_user=; Max-Age=0";
    });
});
