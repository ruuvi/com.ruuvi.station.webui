import React, { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import 'uplot/dist/uPlot.min.css';
import { useTranslation } from 'react-i18next';
import { IconButton, useColorMode } from "@chakra-ui/react";
import { MdInfo } from "react-icons/md";
import { getDisplayValue, getUnitHelper, localeNumber } from "../../UnitHelper";
import UplotTouchZoomPlugin from "./uplotPlugins/UplotTouchZoomPlugin";
import UplotLegendHider from "./uplotPlugins/UplotLegendHider";
import { ruuviTheme } from "../../themes";
import notify from "../../utils/notify";
import { secondsToUserDateString } from "../../TimeHelper";
import Store from "../../Store";
import drawDataGapLines from "./uplotHooks/drawDataGapLines";
import useGraphZoom from "./useGraphZoom";
import useContainerDimensions from "./useContainerDimensions";
import { makeXAxis, makeYAxis } from "./graphAxes";
const UplotReact = React.lazy(() => import('uplot-react'));

// Gaps of at least this many seconds are drawn as dashed lines, and points
// with no neighbor within it are drawn as isolated points.
const GAP_LIMIT_SECONDS = 3600;

// Converts raw measurements into uPlot data [timestamps, values] in the
// currently selected unit, with null markers inserted into time gaps so
// uPlot breaks the line. Also returns the minimum value (for the alert
// gradient) and the indexes of isolated points (for the draw hooks).
function buildGraphData(data, dataKey, unitKey) {
    if (!data || !data.length) return { data: [[], []], dataMin: Number.POSITIVE_INFINITY, isolated: [] };

    const unitHelper = getUnitHelper(dataKey);
    const points = [];
    for (let i = 0; i < data.length; i++) {
        const x = data[i];
        if (x.parsed && x.parsed[dataKey] !== undefined) {
            points.push(x);
        }
    }
    points.sort((a, b) => a.timestamp - b.timestamp);

    const timestamps = [];
    const values = [];
    let dataMin = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const maybeTemp = dataKey === "humidity" ? p.parsed.temperature : undefined;
        const value = unitKey && unitHelper.valueWithUnit // e.g. humidity absolute, voc mg/m3 etc.
            ? unitHelper.valueWithUnit(p.parsed[dataKey], unitKey, maybeTemp)
            : unitHelper.value(p.parsed[dataKey], maybeTemp);

        if (i > 0 && p.timestamp - points[i - 1].timestamp >= GAP_LIMIT_SECONDS) {
            timestamps.push(points[i - 1].timestamp + GAP_LIMIT_SECONDS);
            values.push(null);
        }
        timestamps.push(p.timestamp);
        values.push(value);
        if (value !== null && value < dataMin) dataMin = value;
    }

    return { data: [timestamps, values], dataMin, isolated: findIsolatedPoints(timestamps, values) };
}

// Indexes of points whose nearest non-null neighbors are all at least
// GAP_LIMIT_SECONDS away; these get special rendering since the normal
// line drawing would leave them invisible.
function findIsolatedPoints(timestamps, values) {
    const nonNull = [];
    for (let i = 0; i < values.length; i++) {
        if (values[i] !== null) nonNull.push(i);
    }
    const isolated = [];
    for (let k = 0; k < nonNull.length; k++) {
        const i = nonNull[k];
        const left = k > 0 ? timestamps[i] - timestamps[nonNull[k - 1]] : Number.POSITIVE_INFINITY;
        const right = k < nonNull.length - 1 ? timestamps[nonNull[k + 1]] - timestamps[i] : Number.POSITIVE_INFINITY;
        if (Math.min(left, right) >= GAP_LIMIT_SECONDS) isolated.push(i);
    }
    return isolated;
}

// Alert limits converted to the currently selected unit.
function getAlertRange(alert) {
    let alertMin = alert?.min;
    let alertMax = alert?.max;
    try {
        const uh = getUnitHelper(alert?.type);
        if (alert?.type === "humidity" && uh.unit !== "%") {
            alertMin = -70000;
            alertMax = 70000;
        } else {
            alertMin = uh.value(alertMin);
            alertMax = uh.value(alertMax);
        }
    } catch { /* alert range parse error */ }
    return [alertMin, alertMax];
}

function scaleGradient(u, scaleKey, ori, scaleStops, discrete = false) {
    try {
        let scale = u.scales[scaleKey];

        let minStopIdx;
        let maxStopIdx;

        for (let i = 0; i < scaleStops.length; i++) {
            let stopVal = scaleStops[i][0];

            if (stopVal <= scale.min || minStopIdx === null)
                minStopIdx = i;

            maxStopIdx = i;

            if (stopVal >= scale.max)
                break;
        }

        if (minStopIdx === maxStopIdx)
            return scaleStops[minStopIdx][1];

        let minStopVal = scaleStops[minStopIdx][0];
        let maxStopVal = scaleStops[maxStopIdx][0];

        if (minStopVal === -Infinity)
            minStopVal = scale.min;

        if (maxStopVal === Infinity)
            maxStopVal = scale.max;

        let minStopPos = u.valToPos(minStopVal, scaleKey, true);
        let maxStopPos = u.valToPos(maxStopVal, scaleKey, true);

        let range = minStopPos - maxStopPos;

        let x0, y0, x1, y1;

        if (ori === 1) {
            x0 = x1 = 0;
            y0 = minStopPos;
            y1 = maxStopPos;
        }
        else {
            y0 = y1 = 0;
            x0 = minStopPos;
            x1 = maxStopPos;
        }

        let grd = u.ctx.createLinearGradient(x0, y0, x1, y1);

        let prevColor;

        for (let i = minStopIdx; i <= maxStopIdx; i++) {
            let s = scaleStops[i];
            let stopPos = i === minStopIdx ? minStopPos : i === maxStopIdx ? maxStopPos : u.valToPos(s[0], scaleKey, true);
            let pct = (minStopPos - stopPos) / range;
            if (discrete && i > minStopIdx)
                grd.addColorStop(pct, prevColor);
            grd.addColorStop(pct, prevColor = s[1]);
        }

        return grd;
    } catch {
        return null
    }
}

// Draws small areas from each isolated point down to the zero line so the
// point remains visible without a line segment.
function drawIsolatedPointAreas(u, meta) {
    const s = u.series[1];
    if (!s.show || !meta.isolated.length) return;

    const ctx = u.ctx;
    ctx.save();
    const xd = u.data[0];
    const yd = u.data[1];

    const devicePixelRatio = window.devicePixelRatio || 1;
    const areaWidth = Math.min(Math.max(1 * devicePixelRatio, 1), 3);

    for (const i of meta.isolated) {
        if (yd[i] === null || yd[i] === undefined) continue;
        if (u.scales.x.min > xd[i] || u.scales.x.max < xd[i]) continue;

        const x = u.valToPos(xd[i], 'x', true);
        let y = u.valToPos(yd[i], 'y', true);
        if (u.scales.y.min > yd[i]) y = u.valToPos(u.scales.y.min, 'y', true);
        if (u.scales.y.max < yd[i]) y = u.valToPos(u.scales.y.max, 'y', true);

        let areaToValue = u.valToPos(0, 'y', true);
        if (u.scales.y.min > 0) areaToValue = u.valToPos(u.scales.y.min, 'y', true) + 1;
        if (u.scales.y.max < 0) areaToValue = u.valToPos(u.scales.y.max, 'y', true) - 1;

        ctx.beginPath();
        ctx.moveTo(x - areaWidth, y);
        ctx.lineTo(x - areaWidth, areaToValue);
        ctx.lineTo(x + areaWidth, areaToValue);
        ctx.lineTo(x + areaWidth, y);
        ctx.closePath();

        ctx.fillStyle = meta.fill;
        ctx.fill();
    }
    ctx.restore();
}

// Draws dots for isolated points (when the dot setting is off) and the
// horizontal alert limit lines.
function drawIsolatedPointsAndAlertLines(u, si, meta) {
    if (si !== 1) return; // only data series

    const ctx = u.ctx;
    const s = u.series[si];
    const offset = (s.width % 2) / 2;

    ctx.save();
    const xd = u.data[0];
    const yd = u.data[1];

    if (!meta.showDots) {
        for (const i of meta.isolated) {
            if (yd[i] === null || yd[i] === undefined) continue;
            if (u.scales.x.min > xd[i] || u.scales.x.max < xd[i]) continue;
            if (u.scales.y.min > yd[i] || u.scales.y.max < yd[i]) continue;

            const x = u.valToPos(xd[i], 'x', true);
            const y = u.valToPos(yd[i], 'y', true);
            ctx.beginPath();
            ctx.arc(x, y, 0.5, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

    if (meta.alertEnabled) {
        ctx.save();
        ctx.translate(offset, offset);
        ctx.beginPath();
        const [i0, i1] = s.idxs;
        const lineAt = (val) => {
            const y = u.valToPos(val, 'y', true);
            ctx.moveTo(u.valToPos(xd[i0], 'x', true), y);
            ctx.lineTo(u.valToPos(xd[i1], 'x', true), y);
        }

        ctx.strokeStyle = meta.alertStroke;

        if (meta.alertMax <= u.scales.y.max && meta.alertMax >= u.scales.y.min) {
            lineAt(meta.alertMax);
        }
        if (meta.alertMin >= u.scales.y.min && meta.alertMin <= u.scales.y.max) {
            lineAt(meta.alertMin);
        }

        ctx.stroke();
        ctx.translate(-offset, -offset);
        ctx.restore();
    }

    ctx.restore();
}

// Time-weighted stats over the (possibly zoomed) visible data.
function calculateStats(graphData, zoom, decimals) {
    const [timestamps, values] = graphData;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;
    let count = 0;
    let weightedSum = 0;
    let totalTime = 0;
    let prevTs = null;
    let prevVal = null;

    for (let i = 0; i < timestamps.length; i++) {
        const value = values[i];
        if (value === null) continue;
        if (zoom && (timestamps[i] < zoom[0] || timestamps[i] > zoom[1])) continue;

        if (value < min) min = value;
        if (value > max) max = value;
        sum += value;
        count++;

        if (prevTs !== null) {
            const timeDiff = timestamps[i] - prevTs;
            weightedSum += ((value + prevVal) / 2) * timeDiff;
            totalTime += timeDiff;
        }
        prevTs = timestamps[i];
        prevVal = value;
    }

    if (count === 0) return { min: null, max: null, avg: null };

    let avg = totalTime > 0 ? weightedSum / totalTime : sum / count;
    const factor = Math.pow(10, decimals);
    avg = Math.round(avg * factor) / factor;

    return { min, max, avg };
}

function DataInfo({ graphData, zoom, t, type }) {
    const { min, max, avg } = useMemo(
        () => calculateStats(graphData, zoom, getUnitHelper(type).decimals),
        [graphData, zoom, type]
    );

    return (
        <>
            <span className="graphLabel" style={{ marginRight: 18 }}>
                <b>{t("graph_stat_min")}</b>: {getDisplayValue(type, min)}
            </span>
            <span className="graphLabel" style={{ marginRight: 18 }}>
                <b>{t("graph_stat_max")}</b>: {getDisplayValue(type, max)}
            </span>
            <span className="graphLabel">
                <b>{t("graph_stat_avg")}</b>: {getDisplayValue(type, avg)}
            </span>
            <IconButton mt={"-3px"} variant="ghost" onClick={() => notify.info(t("graph_stats_info"))}>
                <MdInfo size="16" className="buttonSideIcon" />
            </IconButton>
        </>
    );
}

function Graph(props) {
    const { dataKey, unitKey, cardView, alert } = props;
    const { t } = useTranslation();
    const systemColorMode = useColorMode().colorMode;
    const colorMode = props.overrideColorMode || systemColorMode;
    const height = props.height || 300;
    const showDots = Store.getGraphDrawDots();

    const containerRef = useRef(null);
    const measured = useContainerDimensions(containerRef);
    const width = props.width || measured.width;

    useEffect(() => {
        if (props.setRef) props.setRef(containerRef);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Latest prop values for the callbacks living inside the memoized uPlot
    // options, which would otherwise close over stale values.
    const live = useRef({});
    live.current.from = props.from;
    live.current.to = props.to;

    const getXRange = useCallback(() => {
        const { from, to } = live.current;
        return [from / 1000, to ? to / 1000 : new Date().getTime() / 1000];
    }, []);

    const { zoom, xRange, yRange, onTouchZoom } = useGraphZoom({
        dataKey,
        getXRange,
        hasFixedRange: !cardView && !!(props.from && props.to),
    });

    // Unit settings are read from the global store inside the unit helpers,
    // so the current unit strings stand in for them as memo dependencies.
    let unitSig = "";
    try {
        unitSig = getUnitHelper(dataKey).unit || "";
        if (dataKey === "humidity") unitSig += "|" + getUnitHelper("temperature").unit;
    } catch { /* no unit helper for this key */ }
    const dataSig = `${props.data?.length ?? 0}:${props.data?.[0]?.timestamp ?? ""}`;

    const { data: graphData, dataMin, isolated } = useMemo(
        () => buildGraphData(props.data, dataKey, unitKey),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dataSig, unitSig, dataKey, unitKey]
    );

    const [alertMin, alertMax] = getAlertRange(alert);
    const colorFillVar = cardView ? "fillCard" : "fill";

    let gradFloor = dataMin;
    if (isNaN(gradFloor)) gradFloor = -70000;
    gradFloor -= 10;

    // Everything the memoized draw callbacks need, refreshed every render so
    // redraws always use current data-derived values, alerts and theme colors.
    const drawMeta = useRef({});
    drawMeta.current = {
        isolated,
        showDots,
        fill: ruuviTheme.graph[colorFillVar][colorMode],
        stroke: ruuviTheme.graph.stroke[colorMode],
        alertEnabled: !!(alert && alert.enabled),
        alertMin,
        alertMax,
        alertStroke: ruuviTheme.graph.alert.stroke[colorMode],
        fillGrad: [
            [gradFloor, ruuviTheme.graph.alert[colorFillVar][colorMode]],
            [alertMin, ruuviTheme.graph[colorFillVar][colorMode]],
            [alertMax, ruuviTheme.graph.alert[colorFillVar][colorMode]],
        ],
        strokeGrad: [
            [gradFloor, ruuviTheme.graph.alert.stroke[colorMode]],
            [alertMin, ruuviTheme.graph.stroke[colorMode]],
            [alertMax, ruuviTheme.graph.alert.stroke[colorMode]],
        ],
    };

    const alertSig = alert ? `${alert.enabled}|${alertMin}|${alertMax}` : "off";

    // uplot-react re-creates the whole chart when anything but width/height
    // changes in the options, so keep this object as stable as possible;
    // data updates then flow through the much cheaper setData path.
    const baseOptions = useMemo(() => {
        const plugins = [];
        if (!cardView) {
            plugins.push(UplotTouchZoomPlugin(getXRange(), onTouchZoom));
            plugins.push(UplotLegendHider());
        }
        const seriesStroke = (u) => {
            const m = drawMeta.current;
            return m.alertEnabled ? scaleGradient(u, 'y', 1, m.strokeGrad, true) : m.stroke;
        };
        return {
            title: props.title,
            drawOrder: ["series", "axes"],
            plugins,
            legend: {
                show: props.legend === undefined ? true : props.legend,
            },
            series: [{
                label: t('time'),
                class: "graphLabel",
                value: (_, ts) => secondsToUserDateString(ts),
            }, {
                label: props.dataName || t(dataKey),
                class: "graphLabel",
                spanGaps: false,
                points: { show: showDots, size: 3, fill: ruuviTheme.graph.stroke[colorMode] },
                width: 1,
                fill: (u) => {
                    const m = drawMeta.current;
                    return m.alertEnabled ? scaleGradient(u, 'y', 1, m.fillGrad, true) : m.fill;
                },
                stroke: seriesStroke,
                value: (_, rawValue) => localeNumber(rawValue),
            }],
            hooks: {
                drawClear: [
                    (u) => drawIsolatedPointAreas(u, drawMeta.current),
                ],
                drawSeries: [
                    (u, si) => drawDataGapLines(u, si, seriesStroke(u)),
                    (u, si) => drawIsolatedPointsAndAlertLines(u, si, drawMeta.current),
                ],
            },
            cursor: {
                show: props.cursor || false,
                drag: { x: true, y: true, uni: 50 },
                points: {
                    size: 9,
                    fill: ruuviTheme.graph.stroke[colorMode],
                },
            },
            scales: {
                x: { time: true, range: xRange },
                y: { range: yRange },
            },
            axes: [
                makeXAxis(colorMode),
                makeYAxis(colorMode, {
                    size: 45,
                    ticks: { size: 0 },
                    values: (_, ticks) => ticks.map(rawValue => localeNumber(rawValue)),
                }),
            ],
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorMode, showDots, cardView, alertSig, dataKey, props.dataName, props.title, props.legend, props.cursor, t]);

    const options = useMemo(
        () => ({ ...baseOptions, width, height }),
        [baseOptions, width, height]
    );

    const fallback = (
        <center style={{ width: "100%", height: height, paddingTop: height / 4 }}>
            <span className='spinner'></span>
        </center>
    );

    return (
        <div ref={containerRef}>
            <Suspense fallback={fallback}>
                <div style={{ height: height }} id="singleSerieGraph">
                    {width > 0 && <UplotReact options={options} data={graphData} />}
                </div>
                {!cardView &&
                    <center style={{ fontFamily: "Arial", fontSize: "14px", marginTop: 35 }}>
                        <DataInfo graphData={graphData} zoom={zoom} t={t} type={dataKey} />
                    </center>
                }
            </Suspense>
        </div>
    );
}

export default Graph;
