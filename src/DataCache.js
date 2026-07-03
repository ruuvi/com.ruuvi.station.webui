import * as localForage from "localforage";
import logger from "./utils/logger";

const DB_VERSION = 2;

function getKey(sensor, mode) {
    return `cache_${sensor}_${mode}`
}

// Measurement data is cached per (sensor, mode) as an object of segments
// keyed by the `until` timestamp of the fetch that produced them.

var cache = {
    init: async () => {
        let version = await localForage.getItem("cacheVersion")
        if (version != DB_VERSION) await localForage.clear(); // eslint-disable-line eqeqeq -- intentional loose comparison (string vs number)
        await localForage.setItem("cacheVersion", DB_VERSION)
    },
    clear: () => {
        localForage.clear();
    },
    getData: async (sensor, mode) => {
        try {
            return await localForage.getItem(getKey(sensor, mode))
        } catch (e) {
            logger.error(e);
        }
        return null;
    },
    removeData: async (sensor) => {
        let toRemove = [getKey(sensor, "sparse"), getKey(sensor, "mixed"), getKey(sensor, "dense")]
        for (const x of toRemove) {
            try {
                await localForage.removeItem(x)
            } catch {
                logger.warn("failed to remove cache for key", x)
            }
        }
    },
    setData: async (sensor, mode, data) => {
        try {
            await localForage.setItem(getKey(sensor, mode), data);
        } catch (e) {
            logger.error(e);
        }
    },
    // Stores a fetched segment under its `until` timestamp. Segments with
    // fewer than minMeasurements points are not worth caching.
    saveSegment: async (sensor, mode, until, data, minMeasurements = 100) => {
        if (data.measurements.length < minMeasurements) return;
        try {
            const segments = await cache.getData(sensor, mode) || {};
            segments[until] = data;
            await cache.setData(sensor, mode, segments);
        } catch (error) {
            logger.error("Error saving data to cache", error);
        }
    },
    // Returns the newest cached segment whose `until` falls inside
    // (since, until], or null. Resolves null after timeoutMs — Safari's
    // IndexedDB can hang, and a cache read must never block the fetch
    // that follows it.
    getClosestSegment: async (sensor, mode, since, until, timeoutMs = 3000) => {
        const lookup = async () => {
            try {
                const segments = await cache.getData(sensor, mode) || {};
                const timestamps = Object.keys(segments)
                    .map(Number)
                    .filter(ts => !isNaN(ts) && ts <= until && ts > since)
                    .sort((a, b) => b - a);
                for (const ts of timestamps) {
                    if (segments[ts]) {
                        segments[ts].fromCache = true;
                        return { until: ts, data: segments[ts] };
                    }
                }
            } catch (error) {
                logger.error("Error getting cache data", error);
            }
            return null;
        };
        return Promise.race([
            lookup(),
            new Promise(resolve => setTimeout(resolve, timeoutMs, null))
        ]);
    },
}

export default cache
