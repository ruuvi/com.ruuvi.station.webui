// Public responses only need to survive reloads within the current tab.
const PREFIX = "public-sensor-response:";
const TTL = 30000;

function getEntry(storageKey) {
    try {
        const entry = JSON.parse(sessionStorage.getItem(storageKey));
        const age = Date.now() - entry?.fetchedAt;
        if (age >= 0 && age < TTL) return entry;
    } catch {
        // Invalid entries and unavailable storage are cache misses.
    }
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    return null;
}

export function getPublicResponse(key) {
    return getEntry(PREFIX + key)?.response ?? null;
}

export function getPublicHistoryResponse(range) {
    let newest = null;
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (!key?.startsWith(PREFIX)) continue;
            const entry = getEntry(key);
            const cached = entry?.history;
            // Fresh live ranges can share the same cached upper bound even as
            // "now" advances. Historical end dates must be covered exactly.
            if (cached?.scope === range.scope && cached.since <= range.since &&
                (cached.until >= range.until || (cached.live && range.live)) &&
                (!newest || entry.fetchedAt > newest.fetchedAt)) newest = entry;
        }
    } catch { /* Storage may be disabled. */ }
    return newest?.response ?? null;
}

export function savePublicResponse(key, response, history) {
    try {
        // Prune expired ranges and sensors before adding another response.
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const storedKey = sessionStorage.key(i);
            if (storedKey?.startsWith(PREFIX)) getEntry(storedKey);
        }
        sessionStorage.setItem(PREFIX + key, JSON.stringify({ fetchedAt: Date.now(), response, history }));
    } catch {
        // Quota limits or disabled storage must not prevent displaying the response.
    }
}
