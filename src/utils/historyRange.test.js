import { afterEach, expect, it } from "vitest";
import Store from "../Store";
import { clampHistoryRange } from "./historyRange";

afterEach(() => localStorage.clear());

it.each([[28, 30], [84, 90], [168, 180], [336, 365], [672, 730], [1008, 1095]])(
    "restores the %i-day legacy preset as %i days before enforcing the owner's limit",
    (previousDays, days) => {
        localStorage.setItem("graph_from", String(previousDays * 24));
        expect(Store.getGraphFrom()).toBe(days * 24);
        expect(clampHistoryRange(previousDays * 24, 1096 * 24)).toBe(days * 24);
        if (days > 90) expect(clampHistoryRange(Store.getGraphFrom(), 90 * 24)).toBe(90 * 24);
    }
);
