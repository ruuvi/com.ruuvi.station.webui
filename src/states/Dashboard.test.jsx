import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import NetworkApi from "../NetworkApi";

window.matchMedia = window.matchMedia || ((q) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
}));
window.ResizeObserver = window.ResizeObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

const { Provider } = await import("../components/ui/provider");
const Dashboard = (await import("./Dashboard")).default;

let container;
let root;

beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.setItem("user", JSON.stringify({ email: "test@example.com" }));
    localStorage.setItem(
        "sensors",
        JSON.stringify([
            {
                sensor: "sensor1",
                name: "Sensor 1",
                measurements: [],
                owner: "test@example.com",
                alerts: [],
                subscription: { emailAlertAllowed: false },
            },
        ])
    );
    vi.spyOn(NetworkApi.prototype, "getAllSensorsAsync").mockResolvedValue({
        result: "success",
        data: { sensors: JSON.parse(localStorage.getItem("sensors")) },
    });
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function LocationProbe() {
    return <output data-testid="location">{useLocation().pathname}</output>;
}

async function openSensorMenu(action, inputMode = "pointer") {
    await act(async () => {
        root.render(
            <MemoryRouter>
                <Provider>
                    <Dashboard reloadTags={() => {}} />
                    <LocationProbe />
                </Provider>
            </MemoryRouter>,
        );
    });
    await act(async () => container.querySelector('[aria-label="sensor menu"]').click());
    const item = document.body.querySelector(`[role="menuitem"][data-value="${action}"]`);
    expect(item).toBeTruthy();
    if (inputMode === "keyboard") {
        const menu = item.closest('[role="menu"]');
        const index = [...menu.querySelectorAll('[role="menuitem"]')].indexOf(item);
        const pressKey = key => act(async () => menu.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
        await pressKey("Home");
        for (let i = 0; i < index; i++) await pressKey("ArrowDown");
        await pressKey("Enter");
    } else {
        await act(async () => item.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" })));
        await act(async () => item.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" })));
        await act(async () => item.click());
    }
    // Menu cleanup and dialog focus run after the click. The dialog must stay open.
    await act(async () => new Promise(resolve => setTimeout(resolve, 100)));
    expect(container.querySelector('[data-testid="location"]').textContent).toBe("/");
    const dialog = document.body.querySelector('[role="dialog"][data-state="open"]');
    expect(dialog).toBeTruthy();
    return dialog;
}

describe.each(["image_view", "simple_view"])("Dashboard sensor menu (%s)", (cardType) => {
    beforeEach(() => localStorage.setItem("dashboard_card_type", cardType));

    it.each(["pointer", "keyboard"])("renames the sensor via %s and updates the card without navigating", async (inputMode) => {
        const update = vi.spyOn(NetworkApi.prototype, "update").mockImplementation((_mac, _name, success) => {
            success({ result: "success" });
        });
        const dialog = await openSensorMenu("rename", inputMode);
        const input = dialog.querySelector("input");
        await act(async () => {
            input.click();
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "Kitchen");
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await act(async () => dialog.querySelector("button:not([aria-label])").click());

        expect(update).toHaveBeenCalledWith("sensor1", "Kitchen", expect.any(Function));
        expect(container.querySelector('[data-testid="location"]').textContent).toBe("/");
        expect(container.querySelector(".sensorCard").textContent).toContain("Kitchen");
    });

    it("removes the sensor through both dialogs without navigating", async () => {
        const unclaim = vi.spyOn(NetworkApi.prototype, "unclaim").mockImplementation((_mac, _deleteData, success) => {
            success({ result: "success" });
        });
        const dialog = await openSensorMenu("remove");
        await act(async () => dialog.querySelector('[data-scope="switch"][data-part="control"]').click());

        expect(container.querySelector('[data-testid="location"]').textContent).toBe("/");
        expect(dialog.querySelector('input[type="checkbox"]').checked).toBe(true);
        await act(async () => dialog.querySelector("button:not([aria-label])").click());
        expect(container.querySelector('[data-testid="location"]').textContent).toBe("/");
        const confirmation = [...document.body.querySelectorAll('[role="dialog"][data-state="open"]')]
            .find(element => element !== dialog);
        expect(confirmation).toBeTruthy();
        expect(unclaim).not.toHaveBeenCalled();
        await act(async () => confirmation.querySelector("button:last-child").click());

        expect(unclaim).toHaveBeenCalledWith("sensor1", true, expect.any(Function), expect.any(Function));
        expect(container.querySelector('[data-testid="location"]').textContent).toBe("/");
        expect(container.querySelector(".sensorCard")).toBeNull();
    });

    it("closes the remove dialog without navigating and still opens the card itself", async () => {
        const dialog = await openSensorMenu("remove");
        await act(async () => dialog.querySelector('[aria-label="close"]').click());
        expect(container.querySelector('[data-testid="location"]').textContent).toBe("/");
        await act(async () => container.querySelector(".sensorCard").click());
        expect(container.querySelector('[data-testid="location"]').textContent).toBe("/sensor1");
    });
});

describe("Dashboard search", () => {
    it("renders the search icon centered, at v2's 1em size", async () => {
        await act(async () => {
            root.render(
                <MemoryRouter>
                    <Provider>
                        <Dashboard />
                    </Provider>
                </MemoryRouter>
            );
        });

        const searchInput = container.querySelector(".searchInput");
        expect(searchInput).toBeTruthy();

        const searchIconBox = container.querySelector(".buttonSideIcon");
        expect(searchIconBox).toBeTruthy();
        // the teal class has to sit below the element itself: v3's InputElement
        // sets `color: fg.muted`, and recipes outrank globalCss's layer
        expect(searchIconBox.tagName).toBe("SPAN");

        // v2's InputRightElement: a square the height of the input, pinned to
        // its top-right corner, centring a 1em icon at the input's font size.
        // `--input-height` is not usable here — it lives on the <input>, which
        // is a sibling of this element rather than its parent.
        const rules = [...document.querySelectorAll("style")]
            .map((el) => el.textContent)
            .join("\n");
        const element = searchIconBox.parentElement;
        const cls = [...element.classList].find((c) => c.startsWith("css-"));
        const own = rules
            .split("}")
            .filter((r) => r.includes("." + cls))
            .join("}");
        expect(own).toContain("justify-content:center");
        expect(own).toContain("align-items:center");
        expect(own).toContain("top:0");
        expect(own).toMatch(/width:var\(--chakra-sizes-10\)/);
        expect(own).toMatch(/height:var\(--chakra-sizes-10\)/);
        expect(own).toMatch(/font-size:var\(--chakra-font-sizes-md\)/);
        expect(own).not.toContain("--input-height");

        // v2 used @chakra-ui/icons' SearchIcon, which sizes itself at 1em
        const svg = searchIconBox.querySelector("svg");
        expect(svg).toBeTruthy();
        expect(svg.style.width).toBe("1em");
        expect(svg.style.height).toBe("1em");
        expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    });
});
