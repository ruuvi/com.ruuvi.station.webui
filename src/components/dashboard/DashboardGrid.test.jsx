import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, onchange: null, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent: () => false }));
// jsdom has no ResizeObserver; the layout effect needs one
window.ResizeObserver = window.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} };

const { Provider } = await import("../ui/provider");
const DashboardGrid = (await import("./DashboardGrid")).default;

describe("dashboard masonry grid", () => {
    // The layout pass positions absolutely inside a grid container. v3 has no
    // `sx` prop, so styling it through one silently drops the whole block.
    it("applies the grid + absolute-item styles", async () => {
        const c = document.createElement("div");
        document.body.appendChild(c);
        const root = createRoot(c);
        await act(async () => {
            root.render(
                <Provider>
                    <DashboardGrid sensors={[]} order={null} currSize="" onSizeChange={() => {}} disableAdaptiveLayout={false}>
                        {() => <span className="masonry-item">card</span>}
                    </DashboardGrid>
                </Provider>);
        });
        const grid = c.querySelector(".masonry-grid");
        expect(grid).toBeTruthy();
        const gs = window.getComputedStyle(grid);
        expect(gs.display).toBe("grid");
        expect(gs.position).toBe("relative");
        expect(gs.gridTemplateColumns).toContain("minmax");

        const item = grid.querySelector("span");
        expect(window.getComputedStyle(item).position).toBe("absolute");

        await act(async () => { root.unmount(); });
        c.remove();
    });
});
