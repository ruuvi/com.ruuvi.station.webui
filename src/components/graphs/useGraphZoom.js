import { useCallback, useRef, useState } from "react";

/**
 * Shared uPlot zoom bookkeeping for Graph and CompareView.
 *
 * uPlot reports zoom changes through the scale `range` functions. Those
 * callbacks cannot tell a user zoom reset (double click / pinch out) apart
 * from a full-range recalculation caused by a chart re-create or setData,
 * so this hook tracks where the last range request came from and restores
 * the stored zoom when the recalculation was not user-initiated.
 *
 * Returns stable `xRange`/`yRange` functions for the uPlot scale options,
 * an `onTouchZoom` callback for UplotTouchZoomPlugin, and the currently
 * committed x zoom (undefined when not zoomed).
 */
export default function useGraphZoom({ dataKey, getXRange, hasFixedRange = true }) {
    const [zoom, setZoomState] = useState(undefined);
    const s = useRef({
        zoom: undefined,          // committed x zoom [from, to]
        yZoom: undefined,         // committed y zoom [from, to]
        touchZoom: undefined,     // pending touch zoom [from, to], or "reset"
        isTouchZooming: false,
        wasTouchZooming: false,
        fromComponentUpdate: false,
        dataKeyChanged: false,
        prevDataKey: dataKey,
    }).current;

    // A render means the chart may get re-created or receive new data, which
    // re-runs the range functions with full-range extents; they should then
    // restore the stored zoom instead of treating it as a user reset.
    s.fromComponentUpdate = true;
    s.getXRange = getXRange;
    s.hasFixedRange = hasFixedRange;
    if (s.prevDataKey !== dataKey) {
        s.dataKeyChanged = true;
        s.prevDataKey = dataKey;
    }

    const setZoom = useCallback((z) => {
        s.zoom = z;
        setZoomState(z);
    }, [s]);

    const onTouchZoom = useCallback((isZooming) => {
        s.isTouchZooming = isZooming;
        s.wasTouchZooming = true;
    }, [s]);

    const xRange = useCallback((_u, fromX, toX) => {
        const fullRange = s.getXRange();
        if (!s.hasFixedRange) return fullRange;

        if (s.isTouchZooming) {
            // if zoom is close enough to the full x range, assume fully zoomed out
            if (Math.abs(fromX - fullRange[0]) < 1 && Math.abs(toX - fullRange[1]) < 1) {
                s.touchZoom = "reset";
            } else {
                s.touchZoom = [fromX, toX];
            }
            return [fromX, toX];
        }

        if (s.wasTouchZooming) {
            if (s.touchZoom) {
                if (s.touchZoom === "reset") {
                    s.touchZoom = undefined;
                    s.yZoom = undefined;
                    setZoom(undefined);
                    return fullRange;
                }
                setZoom(s.touchZoom);
                s.touchZoom = undefined;
            }
            s.wasTouchZooming = false;
            if (s.zoom && s.fromComponentUpdate) {
                s.fromComponentUpdate = false;
                return s.zoom;
            }
            if (!s.fromComponentUpdate && Number.isInteger(fromX) && Number.isInteger(toX)) {
                s.yZoom = undefined;
                setZoom(undefined);
                return fullRange;
            }
            return [fromX, toX];
        }

        if (s.zoom && s.fromComponentUpdate) {
            s.fromComponentUpdate = false;
            return s.zoom;
        }

        // Integer extents mean uPlot snapped to the full data range: treat it
        // as a zoom reset unless the shown data key just changed.
        if (Number.isInteger(fromX) && Number.isInteger(toX)) {
            if (s.dataKeyChanged) {
                s.dataKeyChanged = false;
                return s.zoom || fullRange;
            }
            s.yZoom = undefined;
            setZoom(undefined);
            return fullRange;
        }
        setZoom([fromX, toX]);
        return [fromX, toX];
    }, [s, setZoom]);

    const yRange = useCallback((_u, fromY, toY) => {
        if (s.yZoom && s.fromComponentUpdate) {
            s.fromComponentUpdate = false;
            return s.yZoom;
        }
        if (s.isTouchZooming) {
            return [fromY, toY];
        }
        if (s.wasTouchZooming) {
            s.yZoom = [fromY, toY];
            return [fromY, toY];
        }
        if (s.dataKeyChanged) {
            s.yZoom = undefined;
        }
        if (s.yZoom && !s.fromComponentUpdate) {
            return s.yZoom;
        }
        if (!s.fromComponentUpdate && fromY !== undefined && toY !== undefined) {
            s.yZoom = undefined;
        }
        return [fromY - 0.5, toY + 0.5];
    }, [s]);

    return { zoom, setZoom, xRange, yRange, onTouchZoom };
}
