import { beforeEach, describe, expect, it } from "vitest";
import { processData } from "./export";

const t = (key) => key;

const setStoredSettings = (settings) =>
    localStorage.setItem("settings", JSON.stringify(settings));

const sensorData = {
    measurements: [
        { timestamp: 1700000000, parsed: { dataFormat: "05", temperature: 20, humidity: 50, pressure: 1013.25 } },
    ],
};

beforeEach(() => {
    localStorage.clear();
});

describe("single sensor export", () => {
    it("exports dewpoint in every temperature unit regardless of the selected one", () => {
        setStoredSettings({ UNIT_TEMPERATURE: "F" });
        const { csvHeader, data } = processData(sensorData, t);

        const dewpointColumns = csvHeader
            .map((header, index) => [header, index])
            .filter(([header]) => header.startsWith("dewpoint"));
        expect(dewpointColumns.map(([header]) => header)).toEqual([
            "dewpoint (°C)",
            "dewpoint (°F)",
            "dewpoint (K)",
        ]);

        const [c, f, k] = dewpointColumns.map(([, index]) => data[0][index]);
        expect(c).toBeCloseTo(9.26, 1);
        expect(f).toBeCloseTo(c * 1.8 + 32, 1);
        expect(k).toBeCloseTo(c + 273.15, 1);
    });

    it("keeps the dewpoint columns right after relative and absolute humidity", () => {
        const { csvHeader } = processData(sensorData, t);
        const start = csvHeader.indexOf("rel_humidity (%)");
        expect(start).toBeGreaterThan(0);
        expect(csvHeader.slice(start, start + 5)).toEqual([
            "rel_humidity (%)",
            "abs_humidity (g/m³)",
            "dewpoint (°C)",
            "dewpoint (°F)",
            "dewpoint (K)",
        ]);
    });
});
