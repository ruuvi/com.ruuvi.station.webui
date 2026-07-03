// Boot smoke test — mounts the real App signed-out and checks the sign-in
// page renders without runtime errors.
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";

// jsdom lacks matchMedia; uPlot and Chakra need it at import/render time
window.matchMedia = window.matchMedia || ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
}));

describe("App boot", () => {
    it("renders the sign-in page without console errors when signed out", async () => {
        const errors = [];
        const errSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
            errors.push(args.map(String).join(" "));
        });

        const { default: App } = await import("./App");

        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(<App />);
        await new Promise(r => setTimeout(r, 800));

        const text = container.textContent;
        expect(text.length).toBeGreaterThan(20);
        // sign-in screen asks for the email address
        expect(text.toLowerCase()).toContain("email");

        const realErrors = errors.filter(e =>
            !e.includes("Not implemented") && // jsdom navigation/canvas stubs
            !e.includes("act(") &&
            !e.includes("fetch failed") && // sandboxed network
            // pre-existing Chakra SlideFade dev warning on the sign-in page
            !e.includes("initialScale")
        );
        expect(realErrors).toEqual([]);

        root.unmount();
        errSpy.mockRestore();
    }, 15000);
});
