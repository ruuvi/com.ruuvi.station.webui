import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
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

vi.mock("../alerts/AlertItem", () => ({ default: () => null }));
vi.mock("../common/EditableText", () => ({ default: () => null }));
vi.mock("./SensorNotesPreview", () => ({ default: () => null }));

const SensorSettings = (await import("./SensorSettings")).default;

let container;
let root;

const renderSettings = (settings, sensorOverrides = {}) => {
    localStorage.setItem("settings", JSON.stringify(settings));
    const sensor = {
        sensor: "test-sensor",
        name: "Test sensor",
        owner: "owner@example.com",
        canShare: false,
        sharedTo: [],
        subscription: {
            subscriptionName: "Pro",
            maxSharesPerSensor: 5,
            offlineAlertAllowed: true,
            delayedAlertAllowed: true,
            emailAlertAllowed: true,
        },
        settings: { defaultDisplayOrder: "true" },
        measurements: [],
        alerts: [],
        offsetTemperature: 1.23,
        offsetHumidity: -3.45,
        offsetPressure: 567,
        ...sensorOverrides,
    };
    act(() =>
        root.render(
            <MemoryRouter>
                <SensorSettings
                    t={(value) => value}
                    sensor={sensor}
                    latestReading={{ temperature: 20, humidity: 50, pressure: 101325 }}
                    mainSensorFields={["temperature", "humidity", "pressure"]}
                    isShared={false}
                    updateAlert={() => {}}
                    setGraphKey={() => {}}
                    onEditName={() => {}}
                    onEditNotes={() => {}}
                    onEditVisibility={() => {}}
                    onOffsetClick={() => {}}
                    onRemoveClick={() => {}}
                />
            </MemoryRouter>,
        ),
    );
};

// Text of the offset row for a type, so a value from another row cannot
// satisfy the assertion (123 Pa and 1.23 °C would both read as "1.23").
const offsetRowText = (type) => {
    const rows = [...container.querySelectorAll("tr")].filter(
        (row) => row.cells[0]?.textContent.trim() === type,
    );
    expect(rows).toHaveLength(1);
    return rows[0].cells[1].textContent;
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

describe("SensorSettings offset correction", () => {
    it("shows offsets with full resolution regardless of resolution settings", () => {
        renderSettings({
            UNIT_TEMPERATURE: "C",
            UNIT_PRESSURE: "1",
            ACCURACY_TEMPERATURE: "0",
            ACCURACY_HUMIDITY_RELATIVE: "0",
            ACCURACY_PRESSURE: "0",
        });

        expect(offsetRowText("temperature")).toContain("1.23");
        expect(offsetRowText("humidity")).toContain("-3.45");
        expect(offsetRowText("pressure")).toContain("5.67");
    });

    it("shows offsets with full resolution when no resolution settings are stored", () => {
        renderSettings({});

        expect(offsetRowText("temperature")).toContain("1.23");
        expect(offsetRowText("humidity")).toContain("-3.45");
        expect(offsetRowText("pressure")).toContain("5.67");
    });

    it("shows a pressure offset in Pa without decimals, Pa has no finer resolution", () => {
        renderSettings({ UNIT_PRESSURE: "0", ACCURACY_PRESSURE: "2" });

        expect(offsetRowText("pressure")).toContain("Pa");
        expect(offsetRowText("pressure")).not.toMatch(/\d[.,]\d/);
    });
});
