import { describe, it, expect } from "vitest";
import { hyphenateSensorName, uppercaseFirst } from "./TextHelper";

describe("TextHelper", () => {
    describe("uppercaseFirst", () => {
        it("capitalizes first letter and lowercases the rest", () => {
            expect(uppercaseFirst("hello")).toBe("Hello");
            expect(uppercaseFirst("WORLD")).toBe("World");
        });
    });

    describe("hyphenateSensorName", () => {
        it("handles empty, null, or undefined values gracefully", () => {
            expect(hyphenateSensorName("")).toBe("");
            expect(hyphenateSensorName(null)).toBe("");
            expect(hyphenateSensorName(undefined)).toBe("");
        });

        it("leaves standard words untouched", () => {
            expect(hyphenateSensorName("Ruuvi 1234")).toBe("Ruuvi 1234");
            expect(hyphenateSensorName("Living Room Greenhouse")).toBe("Living Room Greenhouse");
        });

        it("inserts soft hyphens for camelCase boundaries", () => {
            const res = hyphenateSensorName("ConferenceRoomSensor");
            expect(res).toBe("Conference\u00ADRoom\u00ADSensor");
        });

        it("does not split hex identifiers or non-string values", () => {
            expect(hyphenateSensorName("Ruuvi A1B2")).toBe("Ruuvi A1B2");
            expect(hyphenateSensorName(42)).toBe("");
        });
    });
});
