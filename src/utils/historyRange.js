export const historyTimespans = [
    { k: "1", t: "hour", v: 1 },
    { k: "2", t: "hours", v: 2 },
    { k: "3", t: "hours", v: 3 },
    { k: "6", t: "hours", v: 6 },
    { k: "12", t: "hours", v: 12 },
    { k: "1", t: "day", v: 24 },
    { k: "2", t: "days", v: 24 * 2 },
    { k: "3", t: "days", v: 24 * 3 },
    { k: "1", t: "week", v: 24 * 7 },
    { k: "2", t: "weeks", v: 24 * 7 * 2 },
    { k: "1", t: "month", v: 24 * 30 },
    { k: "3", t: "months", v: 24 * 90 },
    { k: "6", t: "months", v: 24 * 180 },
    { k: "1", t: "year", v: 24 * 365 },
    { k: "2", t: "years", v: 24 * 365 * 2 },
    { k: "3", t: "years", v: 24 * 365 * 3 },
];

// Previous presets counted every month as four weeks, including yearly ranges.
// Preserve the selected label when restoring one of those saved durations.
const legacyHistoryHours = new Map([
    [24 * 28, 24 * 30],
    [24 * 28 * 3, 24 * 90],
    [24 * 28 * 6, 24 * 180],
    [24 * 28 * 12, 24 * 365],
    [24 * 28 * 24, 24 * 365 * 2],
    [24 * 28 * 36, 24 * 365 * 3],
]);

export function normalizeHistoryHours(value) {
    return legacyHistoryHours.get(value) ?? value;
}

// Use a selectable preset when a saved duration exceeds this sensor's plan.
export function clampHistoryRange(value, maxHours = Infinity, now = Date.now()) {
    if (value?.from instanceof Date && value?.to instanceof Date) {
        const earliest = now - maxHours * 3600000;
        // Keep today's end so this custom range can receive new readings.
        // Requests and graph bounds are clipped to the current time separately.
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        const to = Math.min(endOfToday.getTime(), Math.max(earliest, value.to.getTime()));
        return {
            from: new Date(Math.min(now, to, Math.max(earliest, value.from.getTime()))),
            to: new Date(to),
        };
    }
    const hours = Number.isFinite(value) && value > 0 ? normalizeHistoryHours(value) : 24;
    if (hours <= maxHours) return hours;
    return historyTimespans.filter(span => span.v <= maxHours).at(-1)?.v ?? Math.max(0, maxHours);
}
