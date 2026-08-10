import { describe, expect, it } from "vitest";
import { computeGridDimensions, computeMasonryLayout } from "./masonryLayout";

describe("computeGridDimensions", () => {
    it("computes column counts at the dashboard breakpoints", () => {
        // large display: minCardWidth 450, gap 20
        expect(computeGridDimensions({ containerWidth: 1800, minCardWidth: 450, gap: 20 }).columnCount).toBe(3);
        expect(computeGridDimensions({ containerWidth: 1860, minCardWidth: 450, gap: 20 }).columnCount).toBe(4);
        // medium display: minCardWidth 350, gap 20
        expect(computeGridDimensions({ containerWidth: 1000, minCardWidth: 350, gap: 20 }).columnCount).toBe(2);
        // mobile: minCardWidth 320 (no graph) / 280 (graph), gap 10
        expect(computeGridDimensions({ containerWidth: 400, minCardWidth: 320, gap: 10 }).columnCount).toBe(1);
        expect(computeGridDimensions({ containerWidth: 600, minCardWidth: 280, gap: 10 }).columnCount).toBe(2);
    });

    it("never returns fewer than one column", () => {
        expect(computeGridDimensions({ containerWidth: 0, minCardWidth: 450, gap: 20 }).columnCount).toBe(1);
        expect(computeGridDimensions({ containerWidth: 100, minCardWidth: 450, gap: 20 }).columnCount).toBe(1);
    });

    it("splits the width minus gaps evenly between columns, rounding down", () => {
        // 3 columns: (1810 - 2*20) / 3 = 590
        expect(computeGridDimensions({ containerWidth: 1810, minCardWidth: 450, gap: 20 })).toEqual({
            columnCount: 3,
            columnWidth: 590,
        });
        // rounding: (1800 - 2*20) / 3 = 586.67 -> 586
        expect(computeGridDimensions({ containerWidth: 1800, minCardWidth: 450, gap: 20 }).columnWidth).toBe(586);
    });
});

describe("computeMasonryLayout", () => {
    // 3 columns of width 590, x positions 0 / 610 / 1220
    const grid = { containerWidth: 1810, minCardWidth: 450, gap: 20 };

    it("places items left to right into the shortest column", () => {
        const { positions } = computeMasonryLayout({ ...grid, itemHeights: [300, 100, 200, 150, 150, 100] });
        expect(positions).toEqual([
            { x: 0, y: 0 },       // col 0 -> height 300
            { x: 610, y: 0 },     // col 1 -> height 100
            { x: 1220, y: 0 },    // col 2 -> height 200
            { x: 610, y: 100 },   // col 1 shortest (100) -> height 250
            { x: 1220, y: 200 },  // col 2 shortest (200) -> height 350
            { x: 610, y: 250 },   // col 1 shortest (250) -> height 350
        ]);
    });

    it("breaks ties by picking the leftmost column", () => {
        const { positions } = computeMasonryLayout({ ...grid, itemHeights: [100, 100, 100, 100] });
        expect(positions[3]).toEqual({ x: 0, y: 100 });
    });

    it("sets the container height to the tallest column minus one gap", () => {
        const { containerHeight } = computeMasonryLayout({ ...grid, itemHeights: [300, 100, 200] });
        expect(containerHeight).toBe(280);
    });

    it("returns zero height for an empty item list", () => {
        const { positions, containerHeight } = computeMasonryLayout({ ...grid, itemHeights: [] });
        expect(positions).toEqual([]);
        expect(containerHeight).toBe(0);
    });

    it("never returns a negative container height", () => {
        const { containerHeight } = computeMasonryLayout({ ...grid, itemHeights: [10] });
        expect(containerHeight).toBe(0);
    });

    it("gives hidden (zero-height) items a position without advancing the column", () => {
        const { positions } = computeMasonryLayout({ ...grid, itemHeights: [200, 0, 0, 100] });
        // both hidden items land at the top of the shortest columns
        expect(positions[1]).toEqual({ x: 610, y: 0 });
        expect(positions[2]).toEqual({ x: 610, y: 0 });
        expect(positions[3]).toEqual({ x: 610, y: 0 });
    });

    it("stacks items in a single column on narrow screens", () => {
        const { positions, columnCount, containerHeight } = computeMasonryLayout({
            containerWidth: 400,
            minCardWidth: 320,
            gap: 10,
            itemHeights: [180, 180],
        });
        expect(columnCount).toBe(1);
        expect(positions).toEqual([
            { x: 0, y: 0 },
            { x: 0, y: 180 },
        ]);
        expect(containerHeight).toBe(350);
    });
});
