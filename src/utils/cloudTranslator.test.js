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

    it("keeps measurement sequence number in the ordered visibility list", () => {
        expect(ORDERED_VISIBILITY_CODES).toContain("MSN_COUNT");
        expect(visibilityCodes.map(([code]) => code)).toContain("MSN_COUNT");
    });
});
