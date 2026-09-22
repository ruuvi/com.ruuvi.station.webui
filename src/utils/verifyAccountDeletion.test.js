import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDeletionToken, verifyAccountDeletion } from "./verifyAccountDeletion";

beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("deletion email token", () => {
    it.each(["", "?token=", "?token=%20%20", "?token=one&token=two", "?accessToken=session-token"])(
        "rejects a missing or ambiguous token in %s",
        (search) => expect(getDeletionToken(search)).toBeNull(),
    );

    it("reads only the email token and preserves opaque characters", () => {
        expect(getDeletionToken("?token=a%2Bb%26c%3Dd&accessToken=other&lng=fi")).toBe("a+b&c=d");
    });
});

describe("account deletion request", () => {
    it("encodes only the supplied token without reading or changing the current session", async () => {
        const storage = ["getItem", "setItem", "removeItem", "clear"].map((method) =>
            vi.spyOn(Storage.prototype, method).mockImplementation(() => {
                throw new Error("The deletion request must not access session storage");
            }),
        );

        expect(await verifyAccountDeletion("a+b&c=d")).toBe("started");
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe("https://network.ruuvi.com/verify-delete?token=a%2Bb%26c%3Dd");
        expect(options).toMatchObject({
            method: "GET",
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
            redirect: "error",
        });
        expect(options.headers).toBeUndefined();
        expect(options.body).toBeUndefined();
        for (const spy of storage) expect(spy).not.toHaveBeenCalled();
    });

    it.each([null, undefined, "", "   "])("does not send a request without a token (%s)", async (token) => {
        expect(await verifyAccountDeletion(token)).toBe("invalid");
        expect(fetch).not.toHaveBeenCalled();
    });

    it("treats HTTP 403 as an invalid deletion link", async () => {
        fetch.mockResolvedValue({ status: 403 });
        expect(await verifyAccountDeletion("email-token")).toBe("invalid");
    });

    it.each([401, 429, 500, 204])("does not report success for HTTP %s", async (status) => {
        fetch.mockResolvedValue({ status });
        await expect(verifyAccountDeletion("email-token")).rejects.toThrow("could not be confirmed");
    });

    it("propagates a network error without retrying a destructive request", async () => {
        fetch.mockRejectedValue(new TypeError("Failed to fetch"));
        await expect(verifyAccountDeletion("email-token")).rejects.toThrow("Failed to fetch");
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("ends a stalled request after 30 seconds without retrying", async () => {
        vi.useFakeTimers();
        fetch.mockImplementation(
            (_url, { signal }) =>
                new Promise((_resolve, reject) => {
                    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
                }),
        );
        const request = expect(verifyAccountDeletion("email-token")).rejects.toMatchObject({ name: "AbortError" });
        await vi.advanceTimersByTimeAsync(30000);
        await request;
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });
});
