import { afterEach, beforeEach, expect, it, vi } from "vitest";
import pjson from "../package.json";

let NetworkApi, PublicSensorApi, fetchMock;
const success = () => ({ status: 200, json: async () => ({ result: "success" }) });
const get = () => new PublicSensorApi().getLatest("test");

beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 21));
    NetworkApi = (await import("./NetworkApi")).default;
    PublicSensorApi = (await import("./PublicSensorApi")).default;
    fetchMock = vi.fn(async () => success());
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
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
    const anotherSensor = await new PublicSensorApi().getHistory("other", 0, 200);
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
    await expect(new PublicSensorApi().getLatest("test", controller.signal))
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
    const otherSensor = await new PublicSensorApi().getHistory("other", 0, 200);
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
    const result = await new PublicSensorApi().getHistory("test", 0, 200);
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
    const result = await new PublicSensorApi().getHistory("test", 0, 200);
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

it("does not reuse authenticated segments for public history", async () => {
    const cache = (await import("./DataCache")).default;
    const lookup = vi.spyOn(cache, "getClosestSegment").mockResolvedValue({ until: 200, data: {
        measurements: [{ timestamp: 190 }], fromCache: true, nextUp: 50,
    } });
    await new PublicSensorApi().getHistory("test", 175, 200);
    expect(lookup).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
});

const sensorResponse = () => ({ result: "success", data: {
    sensor: "test", measurements: [{ timestamp: 100, data: "raw" }],
} });

it("persists successful readings across module reloads without extending their 30-second lifetime", async () => {
    fetchMock.mockImplementation(async () => ({ status: 200, json: async () => sensorResponse() }));
    const first = await get();
    first.data.measurements[0].data = "modified by caller";
    await vi.advanceTimersByTimeAsync(29999);
    vi.resetModules();
    NetworkApi = (await import("./NetworkApi")).default;
    PublicSensorApi = (await import("./PublicSensorApi")).default;
    expect(await get()).toEqual(sensorResponse());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await get()).toEqual(sensorResponse());
    expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("reuses an empty public history response for a moving range, but fetches a wider selection", async () => {
    const empty = { result: "success", data: { sensor: "test", measurements: [] } };
    fetchMock.mockImplementation(async () => ({ status: 200, json: async () => empty }));
    const selection = "24h";
    const now = Date.now() / 1000;
    await new PublicSensorApi().getHistory("test", now - 86400, now, selection);
    await vi.advanceTimersByTimeAsync(10000);
    vi.resetModules();
    NetworkApi = (await import("./NetworkApi")).default;
    PublicSensorApi = (await import("./PublicSensorApi")).default;
    expect(await new PublicSensorApi().getHistory("test", now - 86400 + 10, now + 10, selection)).toEqual(empty);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await new PublicSensorApi().getHistory("test", now - 7 * 86400 + 10, now + 10, "7d");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("since")).toBe(String(now - 7 * 86400 + 10));
    await new PublicSensorApi().getHistory("test", now - 86400 + 10, now + 10, selection);
    expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("isolates public cache entries by sensor, environment, and authentication", async () => {
    fetchMock.mockImplementation(async () => ({ status: 200, json: async () => sensorResponse() }));
    await get();
    await new PublicSensorApi().getLatest("other");
    localStorage.setItem("env", "staging");
    await get();
    localStorage.removeItem("env");
    await new NetworkApi().request("/get?sensor=test&limit=1");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await get();
    expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("does not cache API errors", async () => {
    fetchMock.mockResolvedValueOnce({ status: 403, json: async () => ({ result: "error", code: "ER_FORBIDDEN" }) });
    expect((await get()).code).toBe("ER_FORBIDDEN");
    await get();
    expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("never sends account credentials or changes the signed-in session", async () => {
    const user = JSON.stringify({ accessToken: "private-token", email: "owner@example.com" });
    localStorage.setItem("user", user);
    fetchMock.mockResolvedValueOnce({ status: 401, json: async () => ({ result: "error", code: "ER_FORBIDDEN" }) });
    expect((await get()).code).toBe("ER_FORBIDDEN");
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].credentials).toBe("omit");
    expect(localStorage.getItem("user")).toBe(user);
});

it.each(["caller", "timeout"])("cancels public streaming bodies on %s cancellation and cleans up", async source => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    let readingBody;
    const started = new Promise(resolve => { readingBody = resolve; });
    fetchMock.mockImplementation(async (_url, { signal }) => ({
        json: () => new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
            readingBody();
        }),
    }));
    const request = new PublicSensorApi().getLatest("test", controller.signal);
    const result = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await started;
    if (source === "caller") controller.abort();
    else await vi.advanceTimersByTimeAsync(30000);
    await result;
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    expect(sessionStorage.length).toBe(0);
});

it("serves fresh cached data even when the public request budget is exhausted", async () => {
    fetchMock.mockResolvedValueOnce({ status: 200, json: async () => sensorResponse() });
    await get();
    for (let i = 1; i < pjson.settings.publicSensorRequestsPerMinute; i++) {
        await new PublicSensorApi().getLatest(`sensor-${i}`);
    }
    expect((await new PublicSensorApi().getLatest("uncached")).code).toBe("ER_THROTTLED");
    expect(await get()).toEqual(sensorResponse());
    expect(fetchMock).toHaveBeenCalledTimes(pjson.settings.publicSensorRequestsPerMinute);
});

it("reuses fresh wider history across duration changes and reloads without renewing its expiry", async () => {
    const now = Date.now() / 1000;
    const timestamps = [now - 1, now - 1800, now - 2 * 86400];
    const history = { result: "success", data: { sensor: "test", measurements: timestamps.map(timestamp => ({ timestamp })) } };
    fetchMock.mockImplementation(async () => ({ status: 200, json: async () => structuredClone(history) }));
    await new PublicSensorApi().getHistory("test", now - 7 * 86400, now, [168, null, 7, 1]);
    await vi.advanceTimersByTimeAsync(10000);
    const day = await new PublicSensorApi().getHistory("test", now - 86400 + 10, now + 10, [24, null, 7, 1]);
    expect(day.data.measurements.map(reading => reading.timestamp)).toEqual(timestamps.slice(0, 2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    day.data.measurements[0].timestamp = 0;
    await vi.advanceTimersByTimeAsync(19999);
    vi.resetModules();
    PublicSensorApi = (await import("./PublicSensorApi")).default;
    const week = await new PublicSensorApi().getHistory("test", now - 7 * 86400 + 29, now + 29, [168, null, 7, 1]);
    expect(week).toEqual(history);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await new PublicSensorApi().getHistory("test", now - 3600 + 30, now + 30, [1, null, 7, 1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("reuses contained historical ranges but fetches uncovered dates and live ranges", async () => {
    const now = Date.now() / 1000;
    const timestamps = [now - 3600, now - 7200, now - 10800];
    fetchMock.mockImplementation(async () => ({ status: 200, json: async () => ({ result: "success", data: {
        sensor: "test", measurements: timestamps.map(timestamp => ({ timestamp })),
    } }) }));
    const api = new PublicSensorApi();
    await api.getHistory("test", now - 20000, now - 3600);
    const cached = await api.getHistory("test", now - 10800, now - 7200);
    expect(cached.data.measurements.map(reading => reading.timestamp)).toEqual([now - 7200, now - 10800]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await api.getHistory("test", now - 86400, now - 3600);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await api.getHistory("test", now - 3600, now);
    expect(fetchMock).toHaveBeenCalledTimes(3);
});

it.each([{ selection: [24, null, 7, 5] }, { selection: [24, null, 3, 1] }])("does not reuse history after the owner's limits change: %j", async ({ selection }) => {
    const now = Date.now() / 1000;
    fetchMock.mockImplementation(async () => ({ status: 200, json: async () => sensorResponse() }));
    await new PublicSensorApi().getHistory("test", now - 7 * 86400, now, [168, null, 7, 1]);
    await new PublicSensorApi().getHistory("test", now - 86400, now, selection);
    expect(fetchMock).toHaveBeenCalledTimes(2);
});
