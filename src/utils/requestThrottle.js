export const isThrottled = response => response?.code === "ER_THROTTLED" || response?.status === 429;

export const throttleRetryDelay = response => Math.max(60000, response?.retryAfterMs || 0);

export function retryAfterMs(headers) {
    const value = headers?.get("Retry-After");
    if (!value) return 60000;
    const seconds = Number(value);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
    return Number.isFinite(delay) ? Math.max(60000, delay) : 60000;
}
