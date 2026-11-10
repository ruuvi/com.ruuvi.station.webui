import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
await import("../../i18n");
const { Provider } = await import("../ui/provider");
const { default: DurationPicker } = await import("./DurationPicker");
let root, container, onChange;
const render = async (maxHistoryDays, value = 90 * 24) => act(async () => {
    root.render(<Provider><DurationPicker value={value} showMaxHours={maxHistoryDays * 24} onChange={onChange} /></Provider>);
});
const options = () => Array.from(document.querySelectorAll('[role="menuitem"]'), item => item.textContent);
const openDropdown = async () => act(async () => {
    container.querySelectorAll("button.durationPicker")[1].click();
});

beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
        observe() {}
        unobserve() {}
        disconnect() {}
    });
    onChange = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(async () => {
    await act(async () => {
        root.unmount();
        // Let the menu's close animation finish before opening another picker.
        await new Promise(resolve => setTimeout(resolve, 120));
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

it.each([90, 92])("offers at most three months for a public sensor with %i days of history", async (days) => {
    await render(days);
    await openDropdown();
    expect(options()).toContain("3 months");
    expect(options()).not.toContain("6 months");
    expect(options().some(option => /year/.test(option))).toBe(false);
    const threeMonths = Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent === "3 months");
    await act(async () => threeMonths.click());
    expect(onChange).toHaveBeenCalledWith(90 * 24);
});

it("selects 730 days for two years on a sensor with 1096 days of history", async () => {
    await render(1096);
    await openDropdown();
    const twoYears = Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent === "2 years");
    await act(async () => twoYears.click());
    expect(onChange).toHaveBeenCalledWith(730 * 24);
});

it("removes longer options and the stale selected label when the limit drops", async () => {
    await render(731, 24 * 7 * 4 * 12 * 2);
    await openDropdown();
    expect(options()).toContain("2 years");
    await render(92, 24 * 7 * 4 * 12 * 2);
    expect(options()).toContain("3 months");
    expect(options()).not.toContain("6 months");
    expect(options().some(option => /year/.test(option))).toBe(false);
    expect(container.textContent).toContain("3 months");
    expect(container.textContent).not.toContain("2 years");
});
