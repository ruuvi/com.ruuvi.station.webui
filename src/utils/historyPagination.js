export function oldestMeasurementTimestamp(measurements) {
    return measurements.reduce((oldest, reading) =>
        Number.isFinite(reading.timestamp) ? Math.min(oldest, reading.timestamp) : oldest,
    Infinity);
}

export function nextHistoryPage(data, since, until, pageSize, isPublic) {
    let next = data.nextUp;
    if (!Number.isFinite(next)) {
        if (!isPublic && !data.fromCache && data.measurements.length < pageSize) return null;
        // The API's until bound is inclusive. Step past the oldest raw reading,
        // even if the decoder cannot display it, to avoid repeating a page.
        next = oldestMeasurementTimestamp(data.measurements) - 1;
    }
    return Number.isFinite(next) && next >= since && next < until ? next : null;
}

export function mergeHistoryMeasurements(previous, incoming) {
    const byTimestamp = new Map(previous.map(reading => [reading.timestamp, reading]));
    for (const reading of incoming) byTimestamp.set(reading.timestamp, reading);
    return Array.from(byTimestamp.values()).sort((a, b) => b.timestamp - a.timestamp);
}
