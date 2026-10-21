import { afterEach, beforeEach, expect, it, vi } from "vitest";
import pjson from "../package.json";

let NetworkApi, fetchMock;
const success = () => ({ status: 200, json: async () => ({ result: "success" }) });
const get = () => new NetworkApi().request("/get?sensor=test&limit=1", { auth: false });

beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 21));
    NetworkApi = (await import("./NetworkApi")).default;
    fetchMock = vi.fn(async () => success());
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
});

it("shares the rolling public budget across API instances and sensors", async () => {
    const count = pjson.settings.publicSensorRequestsPerMinute;
    const results = await Promise.all(Array.from({ length: count + 2 }, get));
    expect(fetchMock).toHaveBeenCalledTimes(count);
    expect(results.slice(count)).toEqual([
        { result: "error", code: "ER_THROTTLED", retryAfterMs: 60000 },
        { result: "error", code: "ER_THROTTLED", retryAfterMs: 60000 },
    ]);
    await vi.advanceTimersByTimeAsync(59999);
    const anotherSensor = await new NetworkApi().request("/get?sensor=other&limit=100000", { auth: false });
    expect(anotherSensor.code).toBe("ER_THROTTLED");
    expect(fetchMock).toHaveBeenCalledTimes(count);
    await vi.advanceTimersByTimeAsync(1);
    await expect(get()).resolves.toEqual({ result: "success" });
    expect(fetchMock).toHaveBeenCalledTimes(count + 1);
});

it("does not limit authenticated requests or unrelated public endpoints", async () => {
    await Promise.all(Array.from({ length: pjson.settings.publicSensorRequestsPerMinute }, get));
    await new NetworkApi().request("/get?sensor=test");
    await new NetworkApi().request("/verify?token=test", { auth: false });
    expect(fetchMock).toHaveBeenCalledTimes(pjson.settings.publicSensorRequestsPerMinute + 2);
});

it("does not consume the budget for an already cancelled request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(new NetworkApi().request("/get?sensor=test", { auth: false, signal: controller.signal }))
        .rejects.toMatchObject({ name: "AbortError" });
    await Promise.all(Array.from({ length: pjson.settings.publicSensorRequestsPerMinute }, get));
    expect(fetchMock).toHaveBeenCalledTimes(pjson.settings.publicSensorRequestsPerMinute);
});

it.each(["120", "Wed, 21 Oct 2026 00:02:00 GMT"])("handles a non-JSON HTTP 429 and respects Retry-After: %s", async (retryAfter) => {
    const json = vi.fn().mockRejectedValue(new SyntaxError("Not JSON"));
    fetchMock.mockResolvedValueOnce({ status: 429, headers: new Headers({ "Retry-After": retryAfter }), json });
    await expect(get()).resolves.toEqual({ result: "error", code: "ER_THROTTLED", retryAfterMs: 120000 });
    expect(json).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000);
    expect((await get()).code).toBe("ER_THROTTLED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000);
    expect((await get()).result).toBe("success");
});

it("backs off across sensors for the backend's ER_THROTTLED code even without HTTP 429", async () => {
    fetchMock.mockResolvedValueOnce({ status: 200, json: async () => ({ result: "error", code: "ER_THROTTLED" }) });
    expect((await get()).retryAfterMs).toBe(60000);
    const otherSensor = await new NetworkApi().request("/get?sensor=other&limit=100000", { auth: false });
    expect(otherSensor.code).toBe("ER_THROTTLED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("uses the requested page size to continue through a partial cache hit", async () => {
    const cache = (await import("./DataCache")).default;
    vi.spyOn(cache, "getClosestSegment").mockResolvedValue({ until: 100, data: {} });
    vi.spyOn(cache, "saveSegment").mockResolvedValue();
    fetchMock.mockResolvedValueOnce({ status: 200, json: async () => ({
        result: "success", data: { measurements: Array.from({ length: 1500 }, () => ({ timestamp: 101 })) },
    }) });
    const result = await new NetworkApi().getAsync("test", 0, 200, {
        limit: pjson.settings.publicSensorDataFetchPaginationSize, auth: false,
    });
    expect(result.data.nextUp).toBe(100);
    expect(fetchMock.mock.calls[0][0]).toContain(`limit=${pjson.settings.publicSensorDataFetchPaginationSize}`);
});
