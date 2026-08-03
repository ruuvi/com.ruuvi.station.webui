// Renders the real DatePicker against react-day-picker v10 and exercises
// range selection, verifying the v10 DOM model the custom CSS relies on.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import DatePicker from "./DatePicker";

const tick = (ms = 50) => new Promise(r => setTimeout(r, ms));

describe("DatePicker", () => {
    // DatePicker disables future days and opens on the current month, so early
    // in a month there are too few selectable days. Fake Date only (not the
    // timers) to keep the visible month deterministic.
    beforeAll(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 0, 20, 12, 0, 0));
    });
    afterAll(() => {
        vi.useRealTimers();
    });

    it("selects a range and applies modifier classes to day cells", async () => {
        const changes = [];
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(<DatePicker onChange={v => changes.push(v)} />);
        await tick();

        // v10 root element and day buttons exist
        expect(container.querySelector(".rdp-root")).toBeTruthy();
        const buttons = [...container.querySelectorAll("button.rdp-day_button:not([disabled])")];
        expect(buttons.length).toBeGreaterThan(4);

        // pick a range of 5 days
        buttons[0].click();
        await tick();
        buttons[4].click();
        await tick();

        const last = changes[changes.length - 1];
        expect(last.from).toBeInstanceOf(Date);
        expect(last.to).toBeInstanceOf(Date);
        expect(last.to.getTime()).toBeGreaterThan(last.from.getTime());

        // modifier classes land on the <td> grid cell, with the button inside —
        // the styling in DatePicker.jsx depends on this structure
        const selectedCells = container.querySelectorAll("td.my-selected");
        expect(selectedCells.length).toBe(5);
        expect(selectedCells[0].querySelector("button.rdp-day_button")).toBeTruthy();
        expect(container.querySelectorAll("td.rdp-range_middle").length).toBe(3);

        root.unmount();
        container.remove();
    }, 15000);
});
