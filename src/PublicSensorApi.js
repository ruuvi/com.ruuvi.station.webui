import pjson from "../package.json";
import { isStagingEnv } from "./utils/env";
import { isThrottled, retryAfterMs } from "./utils/requestThrottle";
import { getPublicResponse, getPublicHistoryResponse, savePublicResponse } from "./PublicDataCache";

// The server limits public requests per IP, across all sensors. This page's
// budget is shared by latest-reading and history requests, API instances, and
// sensor navigation. Other tabs/devices on the same IP can still trigger server
// throttling. Production and staging have separate budgets.
const publicRequestWindows = new Map();
function reservePublicRequest(url) {
    const now = Date.now();
    const window = publicRequestWindows.get(url) || { timestamps: [], retryAt: 0 };
    publicRequestWindows.set(url, window);
    window.timestamps = window.timestamps.filter(timestamp => timestamp > now - 60000);
    const nextSlot = window.timestamps.length >= pjson.settings.publicSensorRequestsPerMinute
        ? window.timestamps[0] + 60000 : now;
    const delay = Math.max(nextSlot, window.retryAt) - now;
    if (delay > 0) return { result: "error", code: "ER_THROTTLED", retryAfterMs: delay };
    window.timestamps.push(now);
    return null;
}

// Public sensors never use account credentials or authenticated history storage.
async function request(endpoint, params, cacheKey, signal, history) {
    if (signal?.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");
    const cached = history ? getPublicHistoryResponse(history) : getPublicResponse(cacheKey);
    if (cached) {
        if (!history) return cached;
        return { ...cached, data: { ...cached.data, measurements: cached.data.measurements.filter(
            reading => reading.timestamp >= history.since && reading.timestamp <= history.until
        ) } };
    }
    const throttled = reservePublicRequest(endpoint);
    if (throttled) return throttled;

    const controller = new AbortController();
    const onAbort = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(`${endpoint}/get?${new URLSearchParams(params)}`, {
            signal: controller.signal, credentials: "omit",
        });
        const result = response.status === 429
            ? { result: "error", code: "ER_THROTTLED" }
            : await response.json();
        if (controller.signal.aborted) throw controller.signal.reason;
        if (isThrottled(result)) {
            result.retryAfterMs = retryAfterMs(response.headers);
            const window = publicRequestWindows.get(endpoint);
            window.retryAt = Math.max(window.retryAt, Date.now() + result.retryAfterMs);
        } else if (result.result === "success" && Array.isArray(result.data?.measurements)) {
            savePublicResponse(cacheKey, result, history);
        }
        return result;
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
    }
}

export default class PublicSensorApi {
    constructor() {
        this.url = isStagingEnv() ? "https://testnet.ruuvi.com" : "https://network.ruuvi.com";
    }

    getLatest(sensor, signal) {
        return request(this.url, { sensor, mode: "dense", limit: 1 },
            JSON.stringify([this.url, sensor, "latest"]), signal);
    }

    // One response is enough, regardless of how much of the range it covers.
    // Cache the requested bounds so narrower selections can reuse this response.
    getHistory(sensor, since, until, selection = [since, until], signal) {
        return request(this.url, {
            sensor, mode: "mixed", since, until,
            limit: pjson.settings.publicSensorDataFetchPaginationSize,
        }, JSON.stringify([this.url, sensor, "history", selection]), signal, {
            // Selections can share data only when history/resolution limits match.
            scope: JSON.stringify([this.url, sensor, Array.isArray(selection) ? selection.slice(2) : []]),
            since, until, live: until === Math.floor(Date.now() / 1000),
        });
    }
}
