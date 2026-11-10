import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NetworkApi from "../NetworkApi";
import pjson from "../../package.json";
import notify from "../utils/notify";

const observed = vi.hoisted(() => ({ graph: null, changeRange: null, range: null }));
vi.mock("../components/graphs/Graph", () => ({ default: (props) => {
    observed.graph = props;
    return <div data-testid="sensor-graph" />;
} }));
vi.mock("../components/common/DurationPicker", () => ({ default: (props) => {
    observed.changeRange = props.onChange;
    observed.range = props.value;
    return <div data-testid="duration-picker" data-max-hours={props.showMaxHours} />;
} }));

window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
await import("../i18n");
const { Provider } = await import("../components/ui/provider");
const Sensor = (await import("./Sensor")).default;
const now = Date.UTC(2026, 8, 10, 12) / 1000;
const reading = (timestamp) => ({ timestamp, data: "0201061BFF99040512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F", rssi: -60 });
const response = (timestamps, extra = {}) => ({ result: "success", data: {
    sensor: "test-sensor", measurements: timestamps.map(reading), ...extra,
} });
let root, container, api, sensor;
const render = async (props = {}) => {
    await act(async () => {
        root.render(<MemoryRouter><Provider><Sensor sensor={sensor} {...props} /></Provider></MemoryRouter>);
    });
};
const flush = async () => { await act(async () => {}); };
const timestamps = () => observed.graph.data.map(x => x.timestamp);

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);
    observed.graph = null;
    observed.changeRange = null;
    localStorage.setItem("user", JSON.stringify({ email: "owner@example.com" }));
    sensor = { sensor: "test-sensor", name: "Test sensor", owner: "owner@example.com", sharedTo: [], alerts: [],
        settings: { defaultDisplayOrder: "true" },
        offsetTemperature: 0, offsetHumidity: 0, offsetPressure: 0,
        subscription: { subscriptionName: "Pro", maxHistoryDays: 30 },
        measurements: [{ timestamp: now - 1, parsed: { temperature: 24.3 } }],
    };
    api = vi.spyOn(NetworkApi.prototype, "getAsync").mockImplementation(async (_mac, since, until) =>
        response([now - 1].filter(timestamp => timestamp >= since && timestamp <= until)));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
});

it("loads initial history once without duplicating readings", async () => {
    await render();
    expect(api).toHaveBeenCalledTimes(1);
    expect(timestamps()).toEqual([now - 1]);
});

it.each([true, false])("shows readings without graph controls or history requests at zero days (public: %s)", async (isPublic) => {
    sensor.subscription.maxHistoryDays = 0;
    await render({ isPublic });
    expect(container.textContent).toContain("Test sensor");
    const reading = container.querySelector(".sensorValueBox");
    expect(reading.textContent).toContain("24.3");
    expect(reading.style.cursor).toBe("default");
    expect(container.querySelector('[data-testid="sensor-graph"]')).toBeNull();
    expect(container.querySelector('[data-testid="duration-picker"]')).toBeNull();
    expect(observed.graph).toBeNull();
    if (isPublic) expect(container.querySelector(".nodatatext")).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(api).not.toHaveBeenCalled();
});

it("shows a compact empty state for a public zero-history sensor without readings", async () => {
    sensor.subscription.maxHistoryDays = 0;
    sensor.measurements = [];
    await render({ isPublic: true });
    expect(container.querySelector(".nodatatext").textContent).toBe("No data. The sensor needs to be in range of a Ruuvi Gateway.");
    expect(container.querySelector('[data-testid="sensor-graph"]')).toBeNull();
    expect(container.querySelector('[data-testid="duration-picker"]')).toBeNull();
    expect(api).not.toHaveBeenCalled();
});

it("offers the public sensor owner's full history window", async () => {
    sensor.subscription.maxHistoryDays = 731;
    await render({ isPublic: true });
    expect(container.querySelector('[data-testid="duration-picker"]').dataset.maxHours).toBe(String(731 * 24));
    expect(container.querySelector('[data-testid="sensor-graph"]')).not.toBeNull();
    expect(container.querySelector(".sensorValueBox").style.cursor).toBe("pointer");
});

it("cancels history when its limit becomes zero and resumes after an upgrade", async () => {
    await render({ isPublic: true });
    let resolve;
    api.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    const signal = api.mock.calls.at(-1)[4];
    sensor = { ...sensor, subscription: { ...sensor.subscription, maxHistoryDays: 0 } };
    await render({ isPublic: true });
    expect(signal.aborted).toBe(true);
    expect(container.querySelector('[data-testid="sensor-graph"]')).toBeNull();
    expect(container.querySelector('[data-testid="duration-picker"]')).toBeNull();
    const calls = api.mock.calls.length;
    await act(async () => resolve(response([now - 1], { nextUp: now - 100 })));
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(api).toHaveBeenCalledTimes(calls);

    sensor = { ...sensor, subscription: { ...sensor.subscription, maxHistoryDays: 731 } };
    await render({ isPublic: true });
    expect(api).toHaveBeenCalledTimes(calls + 2);
    expect(container.querySelector('[data-testid="sensor-graph"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="duration-picker"]').dataset.maxHours).toBe(String(731 * 24));
});

it("aborts pending history on unmount and ignores a late paginated response", async () => {
    let resolve;
    api.mockImplementation(() => new Promise(r => { resolve = r; }));
    await render();
    const signal = api.mock.calls[0][4];
    act(() => root.unmount());
    root = createRoot(container);
    expect(signal?.aborted).toBe(true);
    const calls = api.mock.calls.length;
    await act(async () => resolve(response([now - 1], { nextUp: now - 100 })));
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(api).toHaveBeenCalledTimes(calls);
});

it("cancels the previous range even when only the end date changes", async () => {
    await render();
    const from = new Date((now - 3600) * 1000);
    let resolve;
    api.mockImplementation(() => new Promise(r => { resolve = r; }));
    await act(async () => observed.changeRange({ from, to: new Date((now - 100) * 1000) }));
    const oldSignal = api.mock.calls.at(-1)[4];
    const oldResolve = resolve;
    await act(async () => observed.changeRange({ from, to: new Date((now - 50) * 1000) }));
    expect(oldSignal?.aborted).toBe(true);
    await act(async () => resolve(response([now - 60])));
    await act(async () => oldResolve(response([now - 200], { nextUp: now - 300 })));
    expect(timestamps()).toEqual([now - 60]);
});

it("prunes the rolling window even if the refresh returns no readings", async () => {
    api.mockImplementation(async () => response([now - 1, now - 7200, now - 86400]));
    await render();
    api.mockImplementation(async () => response([]));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(timestamps()).toEqual([now - 1, now - 7200]);
});

it("keeps fixed custom-range history when time passes", async () => {
    await render();
    api.mockImplementation(async () => response([now - 80000]));
    await act(async () => observed.changeRange({ from: new Date((now - 86400) * 1000), to: new Date((now - 70000) * 1000) }));
    api.mockImplementation(async () => response([]));
    await act(async () => vi.advanceTimersByTimeAsync(7 * 3600000));
    expect(timestamps()).toEqual([now - 80000]);
});

it("does not start a refresh while history pagination is pending", async () => {
    let resolve;
    api.mockImplementationOnce(async () => response([now - 1], { nextUp: now - 100 }))
        .mockImplementation(() => new Promise(r => { resolve = r; }));
    await render();
    const calls = api.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(api).toHaveBeenCalledTimes(calls);
    await act(async () => resolve(response([now - 200])));
    await flush();
});

it("ignores a response from the previous sensor after switching", async () => {
    let resolve;
    api.mockImplementation(() => new Promise(r => { resolve = r; }));
    await render();
    const previousResolve = resolve;
    const previousSignal = api.mock.calls[0][4];
    sensor = { ...sensor, sensor: "other-sensor" };
    await render();
    expect(previousSignal.aborted).toBe(true);
    await act(async () => resolve(response([now - 1], { sensor: "other-sensor" })));
    await act(async () => previousResolve(response([now - 100], { nextUp: now - 200 })));
    expect(timestamps()).toEqual([now - 1]);
    expect(api).toHaveBeenCalledTimes(2);
});

it("retains only 24 hours of one-minute readings after seven hours of refreshes", async () => {
    api.mockImplementation(async (_mac, since, until) => {
        const times = [];
        for (let ts = until - 1; ts >= since; ts -= 60) times.push(ts);
        return response(times);
    });
    await render();
    await act(async () => vi.advanceTimersByTimeAsync(7 * 3600000));
    expect(timestamps()).toHaveLength(1440);
    expect(timestamps()[0]).toBe(now + 7 * 3600 - 1);
    expect(timestamps().at(-1)).toBe(now - 17 * 3600 + 59);
    expect(api).toHaveBeenCalledTimes(421);
});

it("still prunes expired readings when the refresh fails", async () => {
    api.mockImplementation(async () => response([now - 1, now - 86400]));
    await render();
    // Network failures leave the remaining history available.
    api.mockImplementation(async () => ({ result: "error", message: "Failed to fetch data" }));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(timestamps()).toEqual([now - 1]);
});

it("assembles paginated history through a cached segment before resuming polling", async () => {
    api.mockImplementationOnce(async () => response([now - 1], { nextUp: now - 60 }))
        .mockImplementationOnce(async () => response([now - 120], { fromCache: true }))
        .mockImplementationOnce(async () => response([now - 180]));
    await render();
    expect(api.mock.calls.map(call => call[2])).toEqual([now, now - 60, now - 121]);
    expect(timestamps()).toEqual([now - 1, now - 120, now - 180]);
    api.mockImplementation(async () => response([now + 59]));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(api).toHaveBeenCalledTimes(4);
    expect(timestamps()).toEqual([now + 59, now - 1, now - 120, now - 180]);
});

it("keeps the large public request limit but checks beyond a short page", async () => {
    api.mockResolvedValueOnce(response(Array.from({ length: pjson.settings.dataFetchPaginationSize }, (_, i) => now - i - 1)));
    await render({ isPublic: true });
    expect(api).toHaveBeenCalledTimes(2);
    expect(api.mock.calls[0][3]).toEqual({ mode: "mixed", limit: pjson.settings.publicSensorDataFetchPaginationSize, auth: false });
    expect(api.mock.calls[1][2]).toBe(now - pjson.settings.dataFetchPaginationSize - 1);
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(api.mock.calls[2][3].limit).toBe(pjson.settings.publicSensorDataFetchPaginationSize);
});

it("fetches the selected three months across short public pages without repeating their boundaries", async () => {
    sensor.subscription.maxHistoryDays = 92;
    localStorage.setItem("graph_from", String(90 * 24));
    const day = 86400;
    api.mockResolvedValueOnce(response([now - 1, now - 30 * day]))
        .mockResolvedValueOnce(response([now - 50 * day, now - 70 * day]))
        .mockResolvedValueOnce(response([now - 89 * day, now - 90 * day]));
    await render({ isPublic: true });
    expect(api.mock.calls.map(call => call[1])).toEqual(Array(3).fill(now - 90 * day));
    expect(api.mock.calls.map(call => call[2])).toEqual([now, now - 30 * day - 1, now - 70 * day - 1]);
    expect(timestamps()).toEqual([now - 1, now - 30 * day, now - 50 * day, now - 70 * day, now - 89 * day, now - 90 * day]);
});

it("continues past a page whose readings cannot be decoded", async () => {
    api.mockResolvedValueOnce(response([], { measurements: [{ timestamp: now - 60, data: "00" }] }))
        .mockResolvedValueOnce(response([now - 120]));
    await render({ isPublic: true });
    expect(api.mock.calls[1][2]).toBe(now - 61);
    expect(timestamps()).toContain(now - 120);
});

it("deduplicates the shared boundary when continuing into cached public history", async () => {
    api.mockResolvedValueOnce(response([now - 1, now - 60], { nextUp: now - 60 }))
        .mockResolvedValueOnce(response([now - 60, now - 120], { fromCache: true }));
    await render({ isPublic: true });
    expect(timestamps()).toEqual([now - 1, now - 60, now - 120]);
    expect(api.mock.calls.map(call => call[2])).toEqual([now, now - 60, now - 121]);
});

it.each(["network", "api"])("retries unfinished public history after a %s failure", async (failure) => {
    api.mockResolvedValueOnce(response([now - 60]));
    if (failure === "network") api.mockRejectedValueOnce(new Error("offline"));
    else api.mockResolvedValueOnce({ result: "error", code: "ER_INTERNAL" });
    api.mockResolvedValueOnce(response([now - 7200]));
    await render({ isPublic: true });
    expect(api.mock.calls[1][2]).toBe(now - 61);
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(api.mock.calls[2][2]).toBe(now - 61);
    expect(api.mock.calls[2][1]).toBeLessThan(now - 7200);
    expect(timestamps()).toContain(now - 7200);
});

it("fetches every page of new readings after the public page has been asleep", async () => {
    await render({ isPublic: true });
    const initialCalls = api.mock.calls.length;
    vi.setSystemTime((now + 7200) * 1000);
    api.mockResolvedValueOnce(response([now + 7000, now + 5000]))
        .mockResolvedValueOnce(response([now + 3000, now + 1000]))
        .mockResolvedValueOnce(response([]));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(api.mock.calls.slice(initialCalls).map(call => call[1])).toEqual([now, now, now]);
    expect(timestamps()).toEqual([now + 7000, now + 5000, now + 3000, now + 1000, now - 1]);
});

it("clamps a saved multi-year selection to the three-month public sensor preset", async () => {
    sensor.subscription.maxHistoryDays = 92;
    localStorage.setItem("graph_from", String(24 * 365 * 2));
    await render({ isPublic: true });
    expect(observed.range).toBe(90 * 24);
    expect(api.mock.calls[0][1]).toBe(now - 90 * 86400);
});

it("clamps the selected range when the owner downgrades to three months", async () => {
    sensor.subscription.maxHistoryDays = 731;
    localStorage.setItem("graph_from", String(24 * 168));
    await render({ isPublic: true });
    sensor = { ...sensor, subscription: { ...sensor.subscription, maxHistoryDays: 92 } };
    const calls = api.mock.calls.length;
    await render({ isPublic: true });
    expect(observed.range).toBe(90 * 24);
    expect(api.mock.calls[calls][1]).toBe(now - 90 * 86400);
});

it("bounds custom dates and cached readings to the owner's available history", async () => {
    sensor.subscription.maxHistoryDays = 92;
    await render({ isPublic: true });
    const calls = api.mock.calls.length;
    api.mockResolvedValueOnce(response([now - 1, now - 92 * 86400, now - 100 * 86400], { fromCache: true }));
    await act(async () => observed.changeRange({
        from: new Date((now - 365 * 86400) * 1000),
        to: new Date((now + 86400) * 1000),
    }));
    expect(api.mock.calls[calls].slice(1, 3)).toEqual([now - 92 * 86400, now]);
    const endOfToday = new Date(now * 1000);
    endOfToday.setHours(23, 59, 59, 999);
    expect(observed.range).toEqual({ from: new Date((now - 92 * 86400) * 1000), to: endOfToday });
    expect(observed.graph.from).toBe((now - 92 * 86400) * 1000);
    expect(observed.graph.to).toBe(now * 1000);
    expect(timestamps()).toEqual([now - 1, now - 92 * 86400]);
});

it("keeps a custom range ending today live while requesting no future readings", async () => {
    await render({ isPublic: true });
    const endOfToday = new Date(now * 1000);
    endOfToday.setHours(23, 59, 59, 999);
    await act(async () => observed.changeRange({ from: new Date((now - 3600) * 1000), to: endOfToday }));
    const calls = api.mock.calls.length;
    api.mockResolvedValueOnce(response([now + 30])).mockResolvedValueOnce(response([]));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(api.mock.calls[calls].slice(1, 3)).toEqual([now, now + 60]);
    expect(timestamps()).toContain(now + 30);
    expect(observed.graph.to).toBe((now + 60) * 1000);
});

it("warns on throttling and resumes the interrupted history page after Retry-After", async () => {
    const errorToast = vi.spyOn(notify, "error");
    api.mockResolvedValueOnce(response([now - 1], { nextUp: now - 60 }))
        .mockResolvedValueOnce({ result: "error", code: "ER_THROTTLED", retryAfterMs: 120000 })
        .mockResolvedValueOnce(response([now - 120]));
    await render({ isPublic: true });
    expect(timestamps()).toEqual([now - 1]);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Too many requests");
    expect(errorToast).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(119999));
    expect(api).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(api.mock.calls[2][2]).toBe(now - 60);
    expect(api.mock.calls[2][1]).toBeLessThan(now - 120);
    expect(timestamps()).toEqual([now - 1, now - 120]);
    expect(container.querySelector('[role="status"]')).toBeNull();
});

it("keeps graph data and clears a throttle warning after a successful refresh", async () => {
    const errorToast = vi.spyOn(notify, "error");
    await render({ isPublic: true });
    api.mockResolvedValueOnce({ result: "error", code: "ER_THROTTLED" });
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(timestamps()).toEqual([now - 1]);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(errorToast).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(container.querySelector('[role="status"]')).toBeNull();
});

it("still shows real API failures as errors", async () => {
    const errorToast = vi.spyOn(notify, "error");
    api.mockResolvedValue({ result: "error", code: "ER_FORBIDDEN" });
    await render({ isPublic: true });
    expect(errorToast).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="status"]')).toBeNull();
});
