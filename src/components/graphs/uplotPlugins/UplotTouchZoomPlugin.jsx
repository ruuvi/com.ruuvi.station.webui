// Below this finger separation (in px) an axis is treated as "not pinched":
// two fingers that are level with each other still wobble a few px vertically
// and that wobble must not turn into a zoom.
const DEADZONE = 20;

// Series data contains nulls wherever the graph has gaps, and `null < min` is
// true for any positive min, so everything that is not a finite number has to
// be skipped explicitly. Returns null when there is nothing usable to bound.
function getYExtent(u) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = 1; i < u.data.length; i++) {
        const series = u.data[i];
        if (!series) continue;
        for (let j = 0; j < series.length; j++) {
            const value = series[j];
            if (!Number.isFinite(value)) continue;
            if (value < min) min = value;
            if (value > max) max = value;
        }
    }

    return min > max ? null : [min - 0.5, max + 0.5];
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

export default function UplotTouchZoomPlugin(getXRange, inZoomingCallback) {
    function ready(u) {
        const over = u.over;
        let rect;
        let oxRange;
        let oyRange;
        let xVal;
        let yVal;
        let yRange;
        let xActive = false;
        let yActive = false;
        let isPinching = false;
        let rafPending = false;
        const fr = { x: 0, y: 0, dx: 1, dy: 1 };
        const to = { x: 0, y: 0, dx: 1, dy: 1 };
        const touchStartOptions = { passive: false };
        const touchMoveOptions = { passive: false };
        const touchEndOptions = { passive: true };
        const previousTouchAction = over.style.touchAction;

        // Android Chrome otherwise claims the gesture for browser pinch zoom
        // before the non-passive touchmove can run. pan-y rather than none so
        // a one-finger drag still scrolls the page past a full-width graph.
        over.style.touchAction = "pan-y";

        function storePos(target, e) {
            const touches = e.touches;
            if (!touches.length) return;

            const t0 = touches[0];
            const t0x = t0.clientX - rect.left;
            const t0y = t0.clientY - rect.top;

            if (touches.length === 1) {
                target.x = t0x;
                target.y = t0y;
                target.dx = target.dy = 1;
                return;
            }

            const t1 = touches[1];
            const t1x = t1.clientX - rect.left;
            const t1y = t1.clientY - rect.top;
            const xMin = Math.min(t0x, t1x);
            const yMin = Math.min(t0y, t1y);
            const xMax = Math.max(t0x, t1x);
            const yMax = Math.max(t0y, t1y);

            // midpts
            target.x = (xMin + xMax) / 2;
            target.y = (yMin + yMax) / 2;

            target.dx = xMax - xMin;
            target.dy = yMax - yMin;
        }

        function zoom() {
            rafPending = false;

            if (!isPinching || !rect) return;

            // An axis only scales when the fingers were meaningfully apart on
            // it to begin with; the rest of the gesture then keeps that
            // decision, so drifting across the deadzone cannot snap the scale.
            // The divisor is floored for the same reason, from the other side.
            const xFactor = xActive ? fr.dx / Math.max(to.dx, DEADZONE) : 1;
            const yFactor = yActive ? fr.dy / Math.max(to.dy, DEADZONE) : 1;

            const leftPct = to.x / rect.width;
            const btmPct = 1 - to.y / rect.height;
            const nxRange = oxRange * xFactor;
            const nxMin = xVal - leftPct * nxRange;
            const nxMax = nxMin + nxRange;
            const nyRange = oyRange * yFactor;
            const nyMin = yVal - btmPct * nyRange;
            const nyMax = nyMin + nyRange;
            const fullXRange = getXRange();

            const clampedNxMin = clamp(nxMin, fullXRange[0], fullXRange[1]);
            const clampedNxMax = clamp(nxMax, fullXRange[0], fullXRange[1]);
            if (!Number.isFinite(clampedNxMin) || !Number.isFinite(clampedNxMax)) return;

            let yScale;
            if (yRange) {
                const clampedNyMin = clamp(nyMin, yRange[0], yRange[1]);
                const clampedNyMax = clamp(nyMax, yRange[0], yRange[1]);
                if (Number.isFinite(clampedNyMin) && Number.isFinite(clampedNyMax)) {
                    yScale = { min: clampedNyMin, max: clampedNyMax };
                }
            }

            u.batch(() => {
                u.setScale("x", { min: clampedNxMin, max: clampedNxMax });
                if (yScale) u.setScale("y", yScale);
            });
        }

        function touchmove(e) {
            if (!isPinching || e.touches.length < 2) return;
            e.preventDefault();
            storePos(to, e);

            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(zoom);
            }
        }

        function touchmovepan(e) {
            const touch = e.changedTouches[0];
            const currentRect = over.getBoundingClientRect();
            u.setCursor({
                left: touch.clientX - currentRect.left,
                top: touch.clientY - currentRect.top,
            });
        }

        function removeDocumentListeners() {
            document.removeEventListener("touchmove", touchmove, touchMoveOptions);
            document.removeEventListener("touchmove", touchmovepan, touchEndOptions);
        }

        function endTouch() {
            removeDocumentListeners();
            if (!isPinching) return;
            isPinching = false;
            inZoomingCallback(false);
        }

        function touchstart(e) {
            if (e.touches.length === 1) {
                document.addEventListener("touchmove", touchmovepan, touchEndOptions);
                const legend = u.root?.querySelector?.(".u-legend") || over.parentElement?.querySelector?.(".u-legend");
                if (legend) legend.style.visibility = "";
                return;
            }
            if (e.touches.length !== 2 || isPinching) return;

            isPinching = true;
            inZoomingCallback(true);
            document.removeEventListener("touchmove", touchmovepan, touchEndOptions);
            rect = over.getBoundingClientRect();
            storePos(fr, e);
            Object.assign(to, fr);

            xActive = fr.dx > DEADZONE;
            yActive = fr.dy > DEADZONE;

            oxRange = u.scales.x.max - u.scales.x.min;
            oyRange = u.scales.y.max - u.scales.y.min;
            xVal = u.posToVal(fr.x, "x");
            yVal = u.posToVal(fr.y, "y");

            // Data keeps arriving through setData after the chart is ready, so
            // the bound the zoom clamps against is only correct if it is taken
            // when the gesture starts.
            yRange = getYExtent(u);

            e.preventDefault();
            document.addEventListener("touchmove", touchmove, touchMoveOptions);
        }

        over.addEventListener("touchstart", touchstart, touchStartOptions);
        document.addEventListener("touchend", endTouch, touchEndOptions);
        document.addEventListener("touchcancel", endTouch, touchEndOptions);

        return () => {
            endTouch();
            document.removeEventListener("touchend", endTouch, touchEndOptions);
            document.removeEventListener("touchcancel", endTouch, touchEndOptions);
            over.removeEventListener("touchstart", touchstart, touchStartOptions);
            over.style.touchAction = previousTouchAction;
        };
    }

    let cleanup;
    return {
        hooks: {
            ready: [
                (_u) => {
                    cleanup = ready(_u);
                },
            ],
            destroy: [() => cleanup?.()],
        },
    };
}
