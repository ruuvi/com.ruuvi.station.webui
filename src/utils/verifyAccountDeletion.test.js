import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getDeletionEnvironment,
    getDeletionToken,
    readDeletionLink,
    verifyAccountDeletion,
} from "./verifyAccountDeletion";

const token = "a".repeat(43);
const progress = {
    status: "completed",
    account: "deleted",
    history: "in_progress",
    notifications: "completed",
    overall: "in_progress",
};
const response = (status, data, headers = {}) => ({
    status,
    headers: new Headers(headers),
    json: async () => ({ result: status < 400 ? "success" : "error", data }),
});
beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, progress))));
afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.history.replaceState(null, "", "/");
});

describe("deletion link", () => {
    it.each(["", "?token=", "?token=%20%20", "?token=one&token=two", "?accessToken=session-token"])(
        "rejects missing or ambiguous tokens in %s",
        (search) => expect(getDeletionToken(search)).toBeNull(),
    );
    it("reads an opaque token from either query or fragment, but not both", () => {
        expect(getDeletionToken("?token=a%2Bb%26c%3Dd")).toBe("a+b&c=d");
        expect(getDeletionToken("?lng=fi", "#token=" + token)).toBe(token);
        expect(getDeletionToken("?token=one", "#token=two")).toBeNull();
        expect(getDeletionToken("", "#token=one&token=two")).toBeNull();
    });
    it.each(["?lng=fi#token=", "?lng=fi&token="])(
        "removes the token from history and preserves unrelated parameters (%s)",
        (prefix) => {
            window.history.replaceState({ keep: true }, "", "/delete-account/" + prefix + token);
            expect(readDeletionLink()).toEqual({ token, environment: "production" });
            expect(window.location.search).toBe("?lng=fi");
            expect(window.location.hash).toBe("");
            expect(window.history.state).toEqual({ keep: true });
        },
    );
    it("selects the backend from the email destination, independently of stored session preferences", () => {
        expect(getDeletionEnvironment("", "devstation.ruuvi.com")).toBe("dev");
        expect(getDeletionEnvironment("", "station.ruuvi.com")).toBe("production");
        expect(getDeletionEnvironment("?env=dev", "localhost")).toBe("dev");
    });
    it.each(["?env=", "?env=staging", "?env=DEV", "?env=dev&env=dev", "?env=dev&env=production"])(
        "rejects unknown or ambiguous environments in %s",
        (search) => expect(getDeletionEnvironment(search)).toBeNull(),
    );
});

describe("deletion API contract", () => {
    it.each(["status", "confirm"])("uses anonymous JSON POST for %s without touching storage", async (action) => {
        const spies = ["getItem", "setItem", "removeItem", "clear"].map((method) =>
            vi.spyOn(Storage.prototype, method).mockImplementation(() => {
                throw new Error("Unexpected session access");
            }),
        );
        expect(await verifyAccountDeletion(token, "production", action)).toEqual(progress);
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe("https://network.ruuvi.com/verify-delete" + (action === "status" ? "/status" : ""));
        expect(options).toMatchObject({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
            redirect: "error",
        });
        expect(url).not.toContain(token);
        for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    });
    it("never falls back from dev to production", async () => {
        fetch.mockRejectedValue(new TypeError("Failed to fetch"));
        await expect(verifyAccountDeletion(token, "dev")).rejects.toThrow();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0]).toBe("https://testnet.ruuvi.com/verify-delete");
    });
    it.each([null, undefined, "", "short-token", "a".repeat(44), "+".repeat(43)])(
        "rejects malformed tokens (%s) locally",
        async (value) => {
            expect(await verifyAccountDeletion(value, "production")).toEqual({ status: "invalid_request" });
            expect(fetch).not.toHaveBeenCalled();
        },
    );
    it("accepts base64url tokens", async () => {
        expect(await verifyAccountDeletion("_-" + "a".repeat(41), "production")).toEqual(progress);
    });
    it.each([
        [400, "invalid_request"],
        [404, "invalid"],
        [410, "expired"],
        [503, "temporarily_failed"],
    ])("handles HTTP %s", async (http, status) => {
        fetch.mockResolvedValue(response(http, { status }));
        expect(await verifyAccountDeletion(token, "production")).toEqual({ status });
    });
    it("accepts pending only from the status endpoint", async () => {
        fetch.mockResolvedValue(response(200, { status: "pending" }));
        expect(await verifyAccountDeletion(token, "production", "status")).toEqual({ status: "pending" });
        await expect(verifyAccountDeletion(token, "production")).rejects.toThrow();
    });
    it("honors processing Retry-After", async () => {
        fetch.mockResolvedValue(response(202, { status: "processing" }, { "Retry-After": "7" }));
        expect(await verifyAccountDeletion(token, "production")).toEqual({ status: "processing", retryAfterMs: 7000 });
    });
    it.each([undefined, "garbage", ""])(
        "defaults rate limits to one minute with header %s, including non-JSON errors",
        async (header) => {
            fetch.mockResolvedValue({
                status: 429,
                headers: new Headers(header ? { "Retry-After": header } : {}),
                json: async () => {
                    throw new Error("Not JSON");
                },
            });
            expect(await verifyAccountDeletion(token, "production")).toEqual({
                status: "rate_limited",
                retryAfterMs: 60000,
            });
        },
    );
    it("honors rate limits even without data.status", async () => {
        fetch.mockResolvedValue(response(429, undefined, { "Retry-After": "90" }));
        expect(await verifyAccountDeletion(token, "production")).toEqual({
            status: "rate_limited",
            retryAfterMs: 90000,
        });
    });
    it.each([200, 204, 401, 403, 404, 500, 502, 503])(
        "does not interpret an empty or unexpected HTTP %s as success or an invalid token",
        async (http) => {
            fetch.mockResolvedValue(response(http, undefined));
            await expect(verifyAccountDeletion(token, "production")).rejects.toThrow();
        },
    );
    it("rejects incomplete progress", async () => {
        fetch.mockResolvedValue(response(200, { status: "completed", account: "deleted" }));
        await expect(verifyAccountDeletion(token, "production")).rejects.toThrow();
    });
    it("aborts stalled body consumption after 30 seconds", async () => {
        vi.useFakeTimers();
        fetch.mockImplementation(async (_url, { signal }) => ({
            status: 200,
            headers: new Headers(),
            json: () =>
                new Promise((_resolve, reject) =>
                    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))),
                ),
        }));
        const assertion = expect(verifyAccountDeletion(token, "production")).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(30000);
        await assertion;
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });
});
