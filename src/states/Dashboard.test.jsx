import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

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
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
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
