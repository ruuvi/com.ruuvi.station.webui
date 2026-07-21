import { describe, expect, it } from "vitest";
import {
    ORDERED_VISIBILITY_CODES,
    visibilityCodes,
    visibilityFromCloudToWeb,
    visibilityFromWebToCloud,
} from "./cloudTranslator";

describe("cloud visibility translator", () => {
    it("maps measurement sequence number in both directions", () => {
        expect(visibilityFromCloudToWeb("MSN_COUNT")).toEqual([
            "measurementSequenceNumber",
            "",
        ]);
        expect(visibilityFromWebToCloud("", "measurementSequenceNumber")).toBe(
            "MSN_COUNT",
        );
    });

    it("keeps the requested CSV and Excel export order", () => {
        expect(ORDERED_VISIBILITY_CODES).toEqual([
            "AQI_INDEX", "CO2_PPM", "PM10_MGM3", "PM25_MGM3", "PM40_MGM3",
            "PM100_MGM3", "VOC_INDEX", "NOX_INDEX", "TEMPERATURE_C",
            "TEMPERATURE_F", "TEMPERATURE_K", "HUMIDITY_0", "HUMIDITY_1",
            "HUMIDITY_2", "PRESSURE_1", "PRESSURE_0", "PRESSURE_2",
            "PRESSURE_3", "MOVEMENT_COUNT", "SOUNDINSTANT_DBA", "SOUNDAVG_DBA",
            "SOUNDPEAK_DBA", "LUMINOSITY_LX", "BATTERY_VOLT", "ACCELERATION_GX",
            "ACCELERATION_GY", "ACCELERATION_GZ", "SIGNAL_DBM", "MSN_COUNT",
        ]);
        expect(visibilityCodes.map(([code]) => code)).toContain("MSN_COUNT");
    });
});
