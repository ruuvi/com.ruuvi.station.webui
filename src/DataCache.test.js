import { describe, expect, it } from "vitest";
import cache from "./DataCache";
import { sortSensors } from "./NetworkApi";

const measurements = n => Array.from({ length: n }, (_, i) => ({ timestamp: i }));

// Each test uses its own sensor id so tests stay independent without
// having to clear the shared localforage store between them.
let sensorSeq = 0;
const nextSensor = () => `AA:BB:CC:DD:EE:0${sensorSeq++}`;

describe("DataCache segments", () => {
    it("stores a segment under its `until` timestamp", async () => {
        const sensor = nextSensor();
        const data = { measurements: measurements(150) };
        await cache.saveSegment(sensor, "mixed", 1000, data);
        expect(await cache.getData(sensor, "mixed")).toEqual({ 1000: data });
    });

    it("skips segments smaller than minMeasurements", async () => {
        const sensor = nextSensor();
        await cache.saveSegment(sensor, "mixed", 1000, { measurements: measurements(99) });
        expect(await cache.getData(sensor, "mixed")).toBeNull();

        await cache.saveSegment(sensor, "mixed", 1000, { measurements: measurements(5) }, 5);
        expect(await cache.getData(sensor, "mixed")).not.toBeNull();
    });

    it("returns the newest segment inside (since, until] and marks it fromCache", async () => {
        const sensor = nextSensor();
        await cache.saveSegment(sensor, "mixed", 500, { measurements: measurements(150), tag: "older" });
        await cache.saveSegment(sensor, "mixed", 800, { measurements: measurements(150), tag: "newer" });
        await cache.saveSegment(sensor, "mixed", 2000, { measurements: measurements(150), tag: "too new" });

        const hit = await cache.getClosestSegment(sensor, "mixed", 100, 1000);
        expect(hit.until).toBe(800);
        expect(hit.data.tag).toBe("newer");
        expect(hit.data.fromCache).toBe(true);
    });

    it("treats segments at exactly `since` as outside the range", async () => {
        const sensor = nextSensor();
        await cache.saveSegment(sensor, "mixed", 500, { measurements: measurements(150) });
        expect(await cache.getClosestSegment(sensor, "mixed", 500, 1000)).toBeNull();
        expect(await cache.getClosestSegment(sensor, "mixed", 499, 1000)).not.toBeNull();
    });

    it("returns null when nothing is cached", async () => {
        expect(await cache.getClosestSegment(nextSensor(), "mixed", 0, 1000)).toBeNull();
    });

    it("keeps modes separate", async () => {
        const sensor = nextSensor();
        await cache.saveSegment(sensor, "dense", 1000, { measurements: measurements(150) });
        expect(await cache.getClosestSegment(sensor, "mixed", 0, 1000)).toBeNull();
        expect(await cache.getClosestSegment(sensor, "dense", 0, 1000)).not.toBeNull();
    });
});

describe("sortSensors", () => {
    it("names unnamed sensors from the MAC and sorts numerically", () => {
        const sensors = sortSensors([
            { sensor: "CB:B8:33:4C:88:4F", name: "Sensor 10" },
            { sensor: "CB:B8:33:4C:88:50", name: "Sensor 2" },
            { sensor: "CB:B8:33:4C:88:51", name: "" },
        ]);
        expect(sensors.map(s => s.name)).toEqual(["Ruuvi 8851", "Sensor 2", "Sensor 10"]);
    });

    it("truncates names to the configured maximum length", () => {
        const [sensor] = sortSensors([{ sensor: "CB:B8:33:4C:88:4F", name: "x".repeat(100) }]);
        expect(sensor.name).toHaveLength(32);
    });
});
