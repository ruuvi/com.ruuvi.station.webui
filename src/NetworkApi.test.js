import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NetworkApi from "./NetworkApi";
import cache from "./DataCache";

describe("request cancellation and cleanup", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([false, true])("cleans up after fetch settles (reject: %s)", async (reject) => {
        const controller = new AbortController();
        const remove = vi.spyOn(controller.signal, "removeEventListener");
        const fetchMock = vi.fn();
        if (reject) fetchMock.mockRejectedValue(new Error("offline"));
        else fetchMock.mockResolvedValue({ json: async () => ({ result: "success" }) });
        vi.stubGlobal("fetch", fetchMock);
        const request = new NetworkApi().request("/test", { timeout: 30000, signal: controller.signal, auth: false });
        if (reject) await expect(request).rejects.toThrow("offline");
        else await expect(request).resolves.toEqual({ result: "success" });
        expect(vi.getTimerCount()).toBe(0);
        expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    });

    it.each(["caller", "timeout"])("cancels a streaming body on %s cancellation", async (source) => {
        const controller = new AbortController();
        const remove = vi.spyOn(controller.signal, "removeEventListener");
        let readingBody;
        const started = new Promise(resolve => { readingBody = resolve; });
        vi.stubGlobal("fetch", vi.fn(async (_url, { signal }) => ({
            json: () => new Promise((_resolve, reject) => {
                signal.addEventListener("abort", () => reject(signal.reason), { once: true });
                readingBody();
            }),
        })));
        const request = new NetworkApi().request("/test", { timeout: 100, signal: controller.signal, auth: false });
        const result = expect(request).rejects.toMatchObject({ name: "AbortError" });
        await started;
        expect(remove).not.toHaveBeenCalled();
        if (source === "caller") controller.abort();
        else await vi.advanceTimersByTimeAsync(100);
        await result;
        expect(remove).toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it("forwards cancellation without a timeout", async () => {
        const controller = new AbortController();
        const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ result: "success" }) });
        vi.stubGlobal("fetch", fetchMock);
        await new NetworkApi().request("/test", { signal: controller.signal, auth: false });
        expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    });

    it("rejects pre-aborted history requests without reading cache or fetching", async () => {
        const controller = new AbortController();
        controller.abort();
        const lookup = vi.spyOn(cache, "getClosestSegment");
        vi.stubGlobal("fetch", vi.fn());
        await expect(new NetworkApi().getAsync("sensor", 0, 100, {}, controller.signal))
            .rejects.toMatchObject({ name: "AbortError" });
        expect(lookup).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("does not fetch after cancellation during cache lookup", async () => {
        const controller = new AbortController();
        vi.spyOn(cache, "getClosestSegment").mockImplementation(async () => { controller.abort(); return null; });
        vi.stubGlobal("fetch", vi.fn());
        await expect(new NetworkApi().getAsync("sensor", 0, 100, {}, controller.signal))
            .rejects.toMatchObject({ name: "AbortError" });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("does not cache a result that arrives after cancellation", async () => {
        const controller = new AbortController();
        const api = new NetworkApi();
        vi.spyOn(cache, "getClosestSegment").mockResolvedValue(null);
        const save = vi.spyOn(cache, "saveSegment").mockResolvedValue();
        vi.spyOn(api, "request").mockImplementation(async () => {
            controller.abort();
            return { result: "success", data: { measurements: [] } };
        });
        await expect(api.getAsync("sensor", 0, 100, {}, controller.signal))
            .rejects.toMatchObject({ name: "AbortError" });
        expect(save).not.toHaveBeenCalled();
    });
});
