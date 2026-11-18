import { describe, expect, it } from "vitest";
import { demoReadings } from "./DemoReadings";
import { DEMO_SENSORS } from "./DemoSensors";

const DAY = 86400;
const START = 1791072000;
const range = values => Math.max(...values) - Math.min(...values);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const week = profile => Array.from({ length: 7 * 288 }, (_, index) => demoReadings(profile, START + index * 300));

describe("synthetic household readings", () => {
    it("keeps readings plausible across the full retention window", () => {
        const temperatures = [
            [18, 25], [15, 22], [-5, 25], [2, 8], [20, 100],
            [-22, -13], [5, 35], [11, 14], [20, 26], [19, 24],
            [19, 24], [20, 22], [19, 26], [5, 17], [5, 38],
            [13, 17], [26, 34], [20, 22], [16, 22], [19, 24],
            [18, 25], [18, 25],
        ];
        for (let profile = 0; profile < DEMO_SENSORS.length; profile++) {
            const samples = Array.from({ length: 90 * 96 }, (_, index) => demoReadings(profile, START - index * 900));
            const [min, max] = temperatures[profile];
            expect(samples.every(row => Object.values(row).every(Number.isFinite)
                && row.temperature >= min && row.temperature <= max
                && row.humidity >= (profile === 4 ? 5 : 20) && row.humidity <= 98
                && row.pressure > 98000 && row.pressure < 104000
                && row.co2 >= 420 && row.co2 < 1800
                && row.pm1 <= row.pm25 && row.pm25 <= row.pm4 && row.pm4 <= row.pm10
                && row.soundAvg <= row.sound && row.sound <= row.soundMax)).toBe(true);
        }
    });

    it("has steadier indoor temperatures, changing weather and shared air pressure", () => {
        const living = week(0);
        const bedroom = week(1);
        const garden = week(2);
        expect(range(garden.map(row => row.temperature))).toBeGreaterThan(3 * range(living.map(row => row.temperature)));
        expect(mean(bedroom.map(row => row.temperature))).toBeLessThan(mean(living.map(row => row.temperature)));
        expect(garden.map(row => row.pressure)).toEqual(living.map(row => row.pressure));
        expect(range(garden.map(row => row.pressure))).toBeGreaterThan(500);
        // Consecutive days must not be copies of the same daily waveform.
        const differences = garden.slice(288).map((row, index) => row.temperature - garden[index].temperature);
        expect(range(differences)).toBeGreaterThan(2);
    });

    it("links cooking to particles and VOC, and occupied evenings to CO2", () => {
        const samples = week(0);
        const cooking = samples.filter(row => row.pm25 > 15);
        const clear = samples.filter(row => row.pm25 < 4);
        expect(cooking.length).toBeGreaterThan(10);
        expect(mean(cooking.map(row => row.voc))).toBeGreaterThan(mean(clear.map(row => row.voc)) + 80);
        const atHour = hour => Array.from({ length: 7 }, (_, day) => demoReadings(0, START + day * DAY + hour * 3600).co2);
        expect(mean(atHour(21))).toBeGreaterThan(mean(atHour(14)) + 300);
    });

    it("shows asymmetric refrigerator cycles with occasional door-opening excursions", () => {
        const samples = week(3).map(row => row.temperature);
        const changes = samples.slice(1).map((value, index) => value - samples[index]);
        expect(changes.filter(value => value > 0).length).toBeGreaterThan(changes.filter(value => value < 0).length);
        expect(Math.min(...changes)).toBeLessThan(-0.6);
        const warm = samples.filter(value => value > 5);
        expect(warm.length).toBeGreaterThan(0);
        expect(warm.length / samples.length).toBeLessThan(0.1);
    });

    it("stays continuous at midnight instead of resetting the day's conditions", () => {
        for (let day = 0; day < 7; day++) {
            for (let profile = 0; profile < DEMO_SENSORS.length; profile++) {
                const timestamp = START + day * DAY;
                const before = demoReadings(profile, timestamp - 1);
                const after = demoReadings(profile, timestamp);
                expect(Math.abs(after.temperature - before.temperature)).toBeLessThan(0.02);
                expect(Math.abs(after.co2 - before.co2)).toBeLessThan(1);
            }
        }
    });

    it("heats the sauna on some evenings, adds steam bursts and cools overnight", () => {
        const samples = week(4);
        const dailyPeaks = Array.from({ length: 7 }, (_, day) => Math.max(...samples.slice(day * 288, (day + 1) * 288).map(row => row.temperature)));
        expect(dailyPeaks.some(peak => peak > 70)).toBe(true);
        expect(dailyPeaks.some(peak => peak < 30)).toBe(true);
        const hot = samples.filter(row => row.temperature > 65);
        expect(Math.min(...hot.map(row => row.humidity))).toBeLessThan(15);
        expect(range(hot.map(row => row.humidity))).toBeGreaterThan(10);
        for (let day = 0; day < 7; day++) {
            expect(demoReadings(4, START + day * DAY + 6 * 3600).temperature).toBeLessThan(23);
        }
    });

    it("gives cold storage, wet rooms, equipment and occupied spaces distinct behavior", () => {
        const freezer = week(5);
        const cellar = week(7);
        const bathroom = week(8);
        const office = week(10);
        const server = week(16);
        const workshop = week(18);
        const meeting = week(19);
        expect(Math.max(...freezer.map(row => row.temperature))).toBeLessThan(-13);
        expect(range(cellar.map(row => row.temperature))).toBeLessThan(1.2);
        expect(range(bathroom.map(row => row.humidity))).toBeGreaterThan(30);
        expect(Math.min(...server.map(row => row.temperature))).toBeGreaterThan(26);
        expect(Math.max(...workshop.map(row => row.pm25))).toBeGreaterThan(50);
        expect(range(meeting.map(row => row.co2))).toBeGreaterThan(800);
        const workHours = office.filter((_, index) => index % 288 >= 120 && index % 288 < 144);
        const overnight = office.filter((_, index) => index % 288 < 72);
        expect(mean(workHours.map(row => row.co2))).toBeGreaterThan(mean(overnight.map(row => row.co2)) + 300);
        const temperatureSignatures = DEMO_SENSORS.map((_, profile) =>
            JSON.stringify(week(profile).filter((_, index) => index % 12 === 0).map(row => row.temperature.toFixed(2))));
        expect(new Set(temperatureSignatures).size).toBe(DEMO_SENSORS.length);
    });
});
