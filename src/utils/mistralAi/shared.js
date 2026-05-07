export function clampNumber(value, min, max) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return min;
    return Math.min(Math.max(numericValue, min), max);
}

export function ensureSuccess(resp, fallbackMessage) {
    if (resp?.result !== "success") {
        throw new Error(resp?.code || resp?.message || fallbackMessage);
    }
}

export function normalizeContent(content) {
    if (Array.isArray(content)) {
        return content.map(part => part.text || "").join("").trim();
    }
    return typeof content === "string" ? content.trim() : "";
}

export function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

export function parseToolArguments(rawArguments) {
    if (!rawArguments) return {};
    if (typeof rawArguments === "object") return rawArguments;
    try {
        return JSON.parse(rawArguments);
    } catch {
        return {};
    }
}
