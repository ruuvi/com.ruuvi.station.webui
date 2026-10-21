import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NetworkApi from "../NetworkApi";

const observed = vi.hoisted(() => ({ props: null }));
vi.mock("./Sensor", () => ({ default: props => {
    observed.props = props;
    return <div data-sensor>{props.sensor.name}</div>;
} }));
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
await import("../i18n");
const { Provider } = await import("../components/ui/provider");
const PublicSensor = (await import("./PublicSensor")).default;
const response = () => ({ result: "success", data: {
    sensor: "test-sensor", name: "Garden", measurements: [{
        timestamp: 1792540800, data: "0201061BFF99040512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F", rssi: -60,
    }],
} });
let root, container, request;
const render = async () => act(async () => {
    root.render(<MemoryRouter initialEntries={["/public/test-sensor"]}><Provider><Routes>
        <Route path="/public/:id" element={<PublicSensor />} />
    </Routes></Provider></MemoryRouter>);
});

beforeEach(() => {
    vi.useFakeTimers();
    observed.props = null;
    request = vi.spyOn(NetworkApi.prototype, "request").mockImplementation(async () => response());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

it("fetches limit=1 before mounting the sensor and starting history", async () => {
    let resolve;
    request.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await render();
    expect(request.mock.calls[0][0]).toBe("/get?sensor=test-sensor&mode=dense&limit=1");
    expect(request.mock.calls[0][1].auth).toBe(false);
    expect(observed.props).toBeNull();
    await act(async () => resolve(response()));
    expect(observed.props.isPublic).toBe(true);
    expect(observed.props.sensor.measurements).toHaveLength(1);
});

it("shows a friendly warning when the first reading is throttled, then retries", async () => {
    request.mockResolvedValueOnce({ result: "error", code: "ER_THROTTLED", retryAfterMs: 120000 });
    await render();
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Too many requests");
    expect(observed.props).toBeNull();
    expect(container.textContent).not.toContain("ER_THROTTLED");
    await act(async () => vi.advanceTimersByTimeAsync(119999));
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(observed.props.sensor.name).toBe("Garden");
    expect(observed.props.throttled).toBe(false);
});

it("keeps the latest sensor mounted while a refresh is throttled", async () => {
    await render();
    const sensor = observed.props.sensor;
    request.mockResolvedValueOnce({ result: "error", code: "ER_THROTTLED" });
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(observed.props.sensor).toBe(sensor);
    expect(observed.props.throttled).toBe(true);
    expect(container.querySelector('[data-sensor]').textContent).toBe("Garden");
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(observed.props.throttled).toBe(false);
});

it("cancels an in-flight reading and stops retrying when unmounted", async () => {
    let resolve;
    request.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await render();
    const signal = request.mock.calls[0][1].signal;
    act(() => root.unmount());
    root = createRoot(container);
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(response()));
    await act(async () => vi.advanceTimersByTimeAsync(120000));
    expect(request).toHaveBeenCalledTimes(1);
    expect(observed.props).toBeNull();
});

it("keeps forbidden sensors on the existing error screen", async () => {
    request.mockResolvedValueOnce({ result: "error", code: "ER_FORBIDDEN" });
    await render();
    expect(observed.props).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector("button")).not.toBeNull();
});
