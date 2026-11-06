export function getDeletionToken(search, hash = "") {
    const tokens = [
        ...new URLSearchParams(search).getAll("token"),
        ...new URLSearchParams(hash.replace(/^#/, "")).getAll("token"),
    ];
    return tokens.length === 1 && tokens[0].trim() ? tokens[0] : null;
}

export function getDeletionEnvironment(search, hostname = window.location.hostname) {
    const environments = new URLSearchParams(search).getAll("env");
    if (environments.length === 0) return hostname === "devstation.ruuvi.com" ? "dev" : "production";
    return environments.length === 1 && environments[0] === "dev" ? "dev" : null;
}

// Capture once before React renders. Keep the bearer token only in memory, not in
// browser history, analytics, or the unrelated signed-in account's storage.
export function readDeletionLink() {
    const url = new URL(window.location.href);
    const link = {
        token: getDeletionToken(url.search, url.hash),
        environment: getDeletionEnvironment(url.search, url.hostname),
    };
    url.searchParams.delete("token");
    url.hash = "";
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    return link;
}

function retryDelay(response, fallback) {
    const value = response.headers.get("Retry-After");
    if (!value?.trim()) return fallback;
    const milliseconds = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now();
    return Number.isFinite(milliseconds) ? Math.max(1000, Math.min(milliseconds, 2147483647)) : fallback;
}

function isProgress(data) {
    const states = ["in_progress", "completed", "needs_attention"];
    return (
        data?.status === "completed" &&
        data.account === "deleted" &&
        [data.history, data.notifications, data.overall].every((value) => states.includes(value))
    );
}

function parseDeletionResponse(response, body, action) {
    const data = body?.data;
    if (response.status === 200 && body?.result === "success") {
        if (isProgress(data) || (action === "status" && data?.status === "pending")) return data;
    }
    if (
        response.status === 202 &&
        action === "confirm" &&
        body?.result === "success" &&
        data?.status === "processing"
    ) {
        return { status: "processing", retryAfterMs: retryDelay(response, 5000) };
    }
    // API Gateway and the generic anonymous limiter can omit data.status or JSON.
    if (response.status === 429) return { status: "rate_limited", retryAfterMs: retryDelay(response, 60000) };
    const errors = { 400: "invalid_request", 404: "invalid", 410: "expired", 503: "temporarily_failed" };
    if (body?.result === "error" && data?.status === errors[response.status] && data?.status) return data;
    throw new Error("Deletion status could not be confirmed.");
}

export async function verifyAccountDeletion(token, environment, action = "confirm", signal) {
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return { status: "invalid_request" };
    const origin =
        environment === "dev"
            ? "https://testnet.ruuvi.com"
            : environment === "production"
              ? "https://network.ruuvi.com"
              : null;
    if (!origin || !["status", "confirm"].includes(action)) throw new Error("Invalid deletion request.");
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 30000);
    try {
        const response = await fetch(origin + "/verify-delete" + (action === "status" ? "/status" : ""), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
            redirect: "error",
            signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        return parseDeletionResponse(response, body, action);
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
    }
}
