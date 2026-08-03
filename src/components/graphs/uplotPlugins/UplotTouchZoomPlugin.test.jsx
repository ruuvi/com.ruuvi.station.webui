import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import UplotTouchZoomPlugin from "./UplotTouchZoomPlugin";

function touch(clientX, clientY) {
    return { clientX, clientY };
}

function touchEvent(type, touches, changedTouches = touches) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "touches", { value: touches });
    Object.defineProperty(event, "changedTouches", { value: changedTouches });
    return event;
}

function makeChart(series = [10, 20, 30]) {
    const over = document.createElement("div");
    const parent = document.createElement("div");
    parent.appendChild(over);
    document.body.appendChild(parent);
    over.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 200 });

    return {
        chart: {
            over,
            root: parent,
            data: [[0, 1, 2], series],
            scales: { x: { min: 0, max: 100 }, y: { min: 10, max: 30 } },
            posToVal: (position, scale) => (scale === "x" ? position / 3 : 30 - position / 10),
            batch: (callback) => callback(),
            setScale: vi.fn(),
            setCursor: vi.fn(),
        },
        over,
        parent,
    };
}

function lastScale(chart, axis) {
    const calls = chart.setScale.mock.calls.filter(([scale]) => scale === axis);
    return calls[calls.length - 1]?.[1];
}

describe("UplotTouchZoomPlugin", () => {
    beforeEach(() => {
        vi.stubGlobal("requestAnimationFrame", (callback) => {
            callback();
            return 1;
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.replaceChildren();
    });

    it("uses cancellable touchmove listeners and prevents native Android gestures", () => {
        const { chart, over } = makeChart();
        const onZooming = vi.fn();
        const addEventListener = vi.spyOn(document, "addEventListener");
        const plugin = UplotTouchZoomPlugin(() => [0, 100], onZooming);
        plugin.hooks.ready[0](chart);

        const start = touchEvent("touchstart", [touch(50, 100), touch(250, 100)]);
        over.dispatchEvent(start);
        expect(start.defaultPrevented).toBe(true);
        // pan-y, not none: a one-finger drag must still scroll the page.
        expect(chart.over.style.touchAction).toBe("pan-y");
        expect(addEventListener.mock.calls).toContainEqual([
            "touchmove",
            expect.any(Function),
            expect.objectContaining({ passive: false }),
        ]);

        const move = touchEvent("touchmove", [touch(40, 100), touch(260, 100)]);
        document.dispatchEvent(move);
        expect(move.defaultPrevented).toBe(true);
        expect(chart.setScale).toHaveBeenCalledWith(
            "x",
            expect.objectContaining({ min: expect.any(Number), max: expect.any(Number) }),
        );
        expect(onZooming).toHaveBeenLastCalledWith(true);

        document.dispatchEvent(touchEvent("touchend", [], [touch(40, 100)]));
        expect(onZooming).toHaveBeenLastCalledWith(false);
        plugin.hooks.destroy[0](chart);
    });

    it("does not mark a single-finger cursor interaction as a zoom", () => {
        const { chart, over } = makeChart();
        const onZooming = vi.fn();
        const plugin = UplotTouchZoomPlugin(() => [0, 100], onZooming);
        plugin.hooks.ready[0](chart);

        over.dispatchEvent(touchEvent("touchstart", [touch(80, 90)]));
        document.dispatchEvent(touchEvent("touchmove", [], [touch(100, 110)]));
        document.dispatchEvent(touchEvent("touchend", [], [touch(100, 110)]));

        expect(onZooming).not.toHaveBeenCalled();
        expect(chart.setCursor).toHaveBeenCalledWith({ left: 100, top: 110 });
        plugin.hooks.destroy[0](chart);
    });

    it("initializes pinch dimensions before the deadzone is crossed", () => {
        const { chart, over } = makeChart();
        const plugin = UplotTouchZoomPlugin(() => [0, 100], vi.fn());
        plugin.hooks.ready[0](chart);

        over.dispatchEvent(touchEvent("touchstart", [touch(100, 80), touch(200, 120)]));
        document.dispatchEvent(touchEvent("touchmove", [touch(102, 82), touch(198, 118)]));

        expect(chart.setScale).toHaveBeenCalled();
        for (const [, range] of chart.setScale.mock.calls) {
            expect(Number.isFinite(range.min)).toBe(true);
            expect(Number.isFinite(range.max)).toBe(true);
        }
        plugin.hooks.destroy[0](chart);
    });

    it("does not scale an axis the pinch never engaged, even if drift crosses the deadzone", () => {
        const { chart, over } = makeChart();
        const plugin = UplotTouchZoomPlugin(() => [0, 100], vi.fn());
        plugin.hooks.ready[0](chart);

        // Fingers start level: the y axis is not part of this gesture.
        over.dispatchEvent(touchEvent("touchstart", [touch(100, 100), touch(200, 100)]));
        // They drift 40px apart vertically, well past the 20px deadzone.
        document.dispatchEvent(touchEvent("touchmove", [touch(100, 80), touch(200, 120)]));

        const y = lastScale(chart, "y");
        expect(y.max - y.min).toBeCloseTo(30 - 10);
        plugin.hooks.destroy[0](chart);
    });

    it("re-reads the x range on every frame so live graphs clamp to now", () => {
        const { chart, over } = makeChart();
        let fullXRange = [0, 100];
        const getXRange = vi.fn(() => fullXRange);
        const plugin = UplotTouchZoomPlugin(getXRange, vi.fn());
        plugin.hooks.ready[0](chart);

        over.dispatchEvent(touchEvent("touchstart", [touch(100, 100), touch(200, 100)]));
        document.dispatchEvent(touchEvent("touchmove", [touch(140, 100), touch(160, 100)]));
        expect(lastScale(chart, "x").max).toBe(100);

        // More data arrived mid-gesture; the clamp has to follow it.
        fullXRange = [0, 200];
        document.dispatchEvent(touchEvent("touchmove", [touch(140, 100), touch(160, 100)]));
        expect(lastScale(chart, "x").max).toBe(200);
        plugin.hooks.destroy[0](chart);
    });

    it("ignores null gaps when bounding the y axis", () => {
        const { chart, over } = makeChart([null, 20, 30]);
        const plugin = UplotTouchZoomPlugin(() => [0, 100], vi.fn());
        plugin.hooks.ready[0](chart);

        // Pinch the y axis shut, which zooms out until the data bound clamps.
        over.dispatchEvent(touchEvent("touchstart", [touch(100, 40), touch(200, 160)]));
        document.dispatchEvent(touchEvent("touchmove", [touch(100, 95), touch(200, 105)]));

        expect(lastScale(chart, "y")).toEqual({ min: 19.5, max: 30.5 });
        plugin.hooks.destroy[0](chart);
    });

    it("skips the y scale entirely when no finite data is loaded yet", () => {
        const { chart, over } = makeChart([null, null]);
        const plugin = UplotTouchZoomPlugin(() => [0, 100], vi.fn());
        plugin.hooks.ready[0](chart);

        over.dispatchEvent(touchEvent("touchstart", [touch(100, 40), touch(200, 160)]));
        document.dispatchEvent(touchEvent("touchmove", [touch(100, 95), touch(200, 105)]));

        expect(lastScale(chart, "x")).toBeDefined();
        expect(lastScale(chart, "y")).toBeUndefined();
        plugin.hooks.destroy[0](chart);
    });

    it("stops listening and restores touch-action once the chart is destroyed", () => {
        const { chart, over } = makeChart();
        const onZooming = vi.fn();
        const plugin = UplotTouchZoomPlugin(() => [0, 100], onZooming);
        plugin.hooks.ready[0](chart);
        plugin.hooks.destroy[0](chart);

        expect(chart.over.style.touchAction).toBe("");

        over.dispatchEvent(touchEvent("touchstart", [touch(100, 100), touch(200, 100)]));
        document.dispatchEvent(touchEvent("touchmove", [touch(140, 100), touch(160, 100)]));

        expect(chart.setScale).not.toHaveBeenCalled();
        expect(onZooming).not.toHaveBeenCalled();
    });
});
