import { ruuviTheme } from "../../themes";
import { date2digits, time2digits } from "../../TimeHelper";

// Shared x-axis tick formatter: dates on ranges of 72h or more, times on
// shorter ones, and no consecutive duplicate labels.
const xTickValues = (_u, ticks) => {
    const xRangeHours = (ticks[ticks.length - 1] - ticks[0]) / 60 / 60;
    const useDates = xRangeHours >= 72;
    let prev = null;
    return ticks.map((raw) => {
        const out = useDates ? date2digits(raw) : time2digits(raw);
        if (prev === out) {
            return useDates ? time2digits(raw) : null;
        }
        prev = out;
        return out;
    });
};

export const makeXAxis = (colorMode) => ({
    grid: { show: false },
    font: "12px Arial",
    stroke: ruuviTheme.graph.axisLabels[colorMode],
    values: xTickValues,
});

export const makeYAxis = (colorMode, extra = {}) => ({
    grid: { stroke: ruuviTheme.graph.grid[colorMode], width: 2 },
    stroke: ruuviTheme.graph.axisLabels[colorMode],
    font: "12px Arial",
    ...extra,
});
