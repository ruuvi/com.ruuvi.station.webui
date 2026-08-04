import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

window.matchMedia =
    window.matchMedia ||
    ((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (v) => v }) }));

const OffsetDialog = (await import("./OffsetDialog")).default;

let container;
let root;

const renderDialog = (settings, open, offsets, lastReading) => {
    localStorage.setItem("settings", JSON.stringify(settings));
    act(() =>
        root.render(
            <OffsetDialog
                open={open}
                onClose={() => {}}
                sensor={{ sensor: "test-sensor" }}
                offsets={offsets}
                lastReading={lastReading}
                updateSensor={() => {}}
            />,
        ),
    );
};

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
});

describe("OffsetDialog", () => {
    it("shows values with full resolution regardless of resolution settings", () => {
        renderDialog(
            { UNIT_TEMPERATURE: "C", ACCURACY_TEMPERATURE: "0" },
            "Temperature",
            { Temperature: 1.23, Humidity: 0, Pressure: 0 },
            { temperature: 20.57 },
        );

        const text = document.body.textContent;
        expect(text).toContain("19.34");
        expect(text).toContain("20.57");
    });

    it("shows values with full resolution when no resolution settings are stored", () => {
        renderDialog({}, "Temperature", { Temperature: 1.23, Humidity: 0, Pressure: 0 }, { temperature: 20.57 });

        const text = document.body.textContent;
        expect(text).toContain("19.34");
        expect(text).toContain("20.57");
    });

    it("keeps pressure in hPa at full resolution", () => {
        renderDialog(
            { UNIT_PRESSURE: "1", ACCURACY_PRESSURE: "0" },
            "Pressure",
            { Temperature: 0, Humidity: 0, Pressure: 0 },
            { pressure: 101325 },
        );

        expect(document.body.textContent).toContain("1,013.25");
    });

    it("shows pressure in Pa without decimals, Pa has no finer resolution", () => {
        renderDialog(
            { UNIT_PRESSURE: "0", ACCURACY_PRESSURE: "2" },
            "Pressure",
            { Temperature: 0, Humidity: 0, Pressure: 0 },
            { pressure: 101325 },
        );

        const text = document.body.textContent;
        expect(text).toContain("101,325 Pa");
        expect(text).not.toContain("101,325.00");
    });
});
