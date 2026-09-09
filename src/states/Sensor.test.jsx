import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NetworkApi from "../NetworkApi";

const observed = vi.hoisted(() => ({ graph: null, changeRange: null }));
vi.mock("../components/graphs/Graph", () => ({ default: (props) => {
    observed.graph = props;
    return null;
} }));
vi.mock("../components/common/DurationPicker", () => ({ default: (props) => {
    observed.changeRange = props.onChange;
    return null;
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
const render = async () => {
    await act(async () => {
        root.render(<MemoryRouter><Provider><Sensor sensor={sensor} /></Provider></MemoryRouter>);
    });
};
const flush = async () => { await act(async () => {}); };
const timestamps = () => observed.graph.data.map(x => x.timestamp);

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);
    observed.graph = null;
    localStorage.setItem("user", JSON.stringify({ email: "owner@example.com" }));
    sensor = { sensor: "test-sensor", name: "Test sensor", owner: "owner@example.com", sharedTo: [], alerts: [],
        settings: { defaultDisplayOrder: "true" },
        offsetTemperature: 0, offsetHumidity: 0, offsetPressure: 0,
        subscription: { subscriptionName: "Pro", maxHistoryDays: 30 },
        measurements: [{ timestamp: now - 1, parsed: { temperature: 24.3 } }],
    };
    api = vi.spyOn(NetworkApi.prototype, "getAsync").mockImplementation(async () => response([now - 1]));
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
    expect(api.mock.calls.map(call => call[2])).toEqual([now, now - 60, now - 120]);
    expect(timestamps()).toEqual([now - 1, now - 120, now - 180]);
    api.mockImplementation(async () => response([now + 59]));
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(api).toHaveBeenCalledTimes(4);
    expect(timestamps()).toEqual([now + 59, now - 1, now - 120, now - 180]);
});
