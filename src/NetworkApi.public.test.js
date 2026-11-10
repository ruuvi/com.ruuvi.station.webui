import { afterEach, beforeEach, expect, it, vi } from "vitest";
import pjson from "../package.json";
import { nextHistoryPage } from "./utils/historyPagination";

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

it("does not jump over uncached history when the server returns a short page", async () => {
    const cache = (await import("./DataCache")).default;
    vi.spyOn(cache, "getClosestSegment").mockResolvedValue({ until: 100, data: {} });
    vi.spyOn(cache, "saveSegment").mockResolvedValue();
    fetchMock.mockResolvedValueOnce({ status: 200, json: async () => ({
        result: "success", data: { measurements: Array.from({ length: 1500 }, () => ({ timestamp: 101 })) },
    }) });
    const result = await new NetworkApi().getAsync("test", 0, 200, {
        limit: pjson.settings.publicSensorDataFetchPaginationSize, auth: false,
    });
    expect(result.data.nextUp).toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toContain(`limit=${pjson.settings.publicSensorDataFetchPaginationSize}`);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("since")).toBe("0");
});

it.each([{ measurements: [] }, { measurements: [{ timestamp: 100 }] }])("keeps the selected public range even when a page reaches a partial cache hit: %j", async ({ measurements }) => {
    const cache = (await import("./DataCache")).default;
    vi.spyOn(cache, "getClosestSegment").mockResolvedValue({ until: 100, data: {} });
    vi.spyOn(cache, "saveSegment").mockResolvedValue();
    fetchMock.mockResolvedValueOnce({ status: 200, json: async () => ({
        result: "success", data: { measurements },
    }) });
    const result = await new NetworkApi().getAsync("test", 0, 200, { auth: false });
    expect(result.data.nextUp).toBeUndefined();
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("since")).toBe("0");
});

it("still joins authenticated requests to a partially cached range", async () => {
    const cache = (await import("./DataCache")).default;
    vi.spyOn(cache, "getClosestSegment").mockResolvedValue({ until: 100, data: {} });
    vi.spyOn(cache, "saveSegment").mockResolvedValue();
    fetchMock.mockResolvedValueOnce({ status: 200, json: async () => ({
        result: "success", data: { measurements: [{ timestamp: 150 }] },
    }) });
    const result = await new NetworkApi().getAsync("test", 0, 200);
    expect(result.data.nextUp).toBe(100);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("since")).toBe("100");
});

it("discards stale cached continuation hints without modifying the cached segment", async () => {
    const cache = (await import("./DataCache")).default;
    const cached = { measurements: [{ timestamp: 190 }, { timestamp: 150 }], fromCache: true, nextUp: 50 };
    vi.spyOn(cache, "getClosestSegment").mockResolvedValue({ until: 200, data: cached });
    const result = await new NetworkApi().getAsync("test", 175, 200, { auth: false });
    expect(result.data.measurements).toEqual([{ timestamp: 190 }]);
    expect(result.data.nextUp).toBeUndefined();
    expect(cached.measurements).toHaveLength(2);
    expect(cached.nextUp).toBe(50);
    expect(fetchMock).not.toHaveBeenCalled();
});

it("fills the entire range through short network pages, a cached segment, and older readings", async () => {
    const cache = (await import("./DataCache")).default;
    vi.spyOn(cache, "getClosestSegment").mockImplementation(async (_mac, _mode, since, until) =>
        since < 599 && until >= 599 ? { until: 599, data: {
            measurements: [{ timestamp: 190 }, { timestamp: 150 }], fromCache: true, nextUp: 50,
        } } : null);
    vi.spyOn(cache, "saveSegment").mockResolvedValue();
    for (const timestamps of [[900, 800], [700, 600], [100, 50], []]) {
        fetchMock.mockResolvedValueOnce({ status: 200, json: async () => ({ result: "success", data: {
            measurements: timestamps.map(timestamp => ({ timestamp })),
        } }) });
    }
    let until = 1000;
    const readings = [];
    while (until !== null) {
        const response = await new NetworkApi().getAsync("test", 0, until, { auth: false });
        expect(response.result).toBe("success");
        readings.push(...response.data.measurements.map(reading => reading.timestamp));
        until = nextHistoryPage(response.data, 0, until, 100000, true);
    }
    expect(readings).toEqual([900, 800, 700, 600, 190, 150, 100, 50]);
    expect(fetchMock.mock.calls.map(([url]) => Number(new URL(url).searchParams.get("until"))))
        .toEqual([1000, 799, 149, 49]);
    expect(fetchMock.mock.calls.map(([url]) => Number(new URL(url).searchParams.get("since"))))
        .toEqual([0, 0, 0, 0]);
});
