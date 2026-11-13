import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import cache from "../DataCache";

const observed = vi.hoisted(() => ({ graph: null }));
vi.mock("../components/graphs/Graph", () => ({ default: props => {
    observed.graph = props;
    return <div data-testid="sensor-graph" />;
} }));
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
await import("../i18n");
const { Provider } = await import("../components/ui/provider");
const PublicSensor = (await import("./PublicSensor")).default;

const cachedUntil = 1794337491;
let now = cachedUntil + 60;
const day = 86400;
const reading = timestamp => ({ timestamp, data: "0201061BFF99040512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F", rssi: -60 });
const response = timestamps => ({ status: 200, json: async () => ({ result: "success", data: {
    sensor: "test-sensor", name: "Garden", maxHistoryDays: 1096, maxResolutionMinutes: 1,
    measurements: timestamps.map(reading),
} }) });
let root, container, fetchMock;
const historyRequests = () => fetchMock.mock.calls.map(([url]) => new URL(url).searchParams)
    .filter(query => query.get("mode") === "mixed")
    .map(query => ({ since: Number(query.get("since")), until: Number(query.get("until")) }));

beforeEach(() => {
    now += 120;
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);
    vi.stubGlobal("ResizeObserver", class {
        observe() {}
        unobserve() {}
        disconnect() {}
    });
    const history = [now - 1, now - 1800, now - 2 * day, now - 3 * day, now - 5 * day, now - 6 * day, now - 8 * day];
    fetchMock = vi.fn(async url => {
        const query = new URL(url).searchParams;
        if (query.get("limit") === "1") return response([Math.floor(Date.now() / 1000) - 1]);
        const since = Number(query.get("since"));
        const until = Number(query.get("until"));
        // Simulate short storage pages, independent of the requested limit.
        return response(history.filter(timestamp => timestamp >= since && timestamp <= until).slice(0, 2));
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(cache, "getClosestSegment").mockImplementation(async (_mac, _mode, since, until) =>
        since < cachedUntil && until >= cachedUntil ? { until: cachedUntil, data: {
            sensor: "test-sensor", measurements: [reading(now - 1800)], fromCache: true,
        } } : null);
    vi.spyOn(cache, "saveSegment").mockResolvedValue();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
});

it("fetches the seven-day selection once even when the response only covers 30 minutes", async () => {
    await act(async () => {
        root.render(<MemoryRouter initialEntries={["/public/test-sensor"]}><Provider><Routes>
            <Route path="/public/:id" element={<PublicSensor />} />
        </Routes></Provider></MemoryRouter>);
    });
    expect(observed.graph.data.map(reading => reading.timestamp)).toEqual([now - 1, now - 1800]);
    const previousRequests = historyRequests().length;
    await act(async () => container.querySelectorAll("button.durationPicker")[1].click());
    const oneWeek = Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent === "1 week");
    expect(oneWeek).toBeDefined();
    const options = Array.from(document.querySelectorAll('[role="menuitem"]')).map(item => item.textContent);
    expect(options).not.toContain("2 weeks");
    expect(options).not.toContain("2 years");
    await act(async () => oneWeek.click());

    const since = now - 7 * day;
    expect(historyRequests().slice(previousRequests)).toEqual([{ since, until: now }]);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(localStorage.getItem("graph_from")).toBe(String(7 * 24));

    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(historyRequests().slice(previousRequests)).toEqual([
        { since, until: now },
        { since: since + 60, until: now + 60 },
    ]);
    expect(observed.graph.data.map(reading => reading.timestamp)).toEqual([now + 59, now - 1, now - 1800]);
    expect(observed.graph.from).toBe((since + 60) * 1000);
    expect(container.querySelector('[role="status"]')).toBeNull();
});


it("reloads both the reading and history from cache until they are 30 seconds old", async () => {
    const render = () => act(async () => {
        root.render(<MemoryRouter initialEntries={["/public/test-sensor"]}><Provider><Routes>
            <Route path="/public/:id" element={<PublicSensor />} />
        </Routes></Provider></MemoryRouter>);
    });
    const reload = async () => {
        act(() => root.unmount());
        root = createRoot(container);
        await render();
    };
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(historyRequests()).toHaveLength(1);
    await act(async () => vi.advanceTimersByTimeAsync(29999));
    await reload();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(observed.graph.data.map(reading => reading.timestamp)).toEqual([now - 1, now - 1800]);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    await reload();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(historyRequests()).toHaveLength(2);
});

it("changes the duration using fresh wider history without fetching or losing the original range", async () => {
    localStorage.setItem("graph_from", String(7 * 24));
    const timestamps = [now - 1, now - 1800, now - 2 * day];
    fetchMock.mockImplementation(async url => {
        const query = new URL(url).searchParams;
        return query.get("limit") === "1" ? response([now - 1]) : response(timestamps.filter(
            timestamp => timestamp >= Number(query.get("since")) && timestamp <= Number(query.get("until"))
        ));
    });
    await act(async () => {
        root.render(<MemoryRouter initialEntries={["/public/test-sensor"]}><Provider><Routes>
            <Route path="/public/:id" element={<PublicSensor />} />
        </Routes></Provider></MemoryRouter>);
    });
    const chooseDuration = async label => {
        await act(async () => container.querySelectorAll("button.durationPicker")[1].click());
        const option = Array.from(document.querySelectorAll('[role="menuitem"]')).find(item => item.textContent === label);
        expect(option).toBeDefined();
        await act(async () => option.click());
    };
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(observed.graph.data.map(reading => reading.timestamp)).toEqual(timestamps);
    await act(async () => vi.advanceTimersByTimeAsync(10000));
    await chooseDuration("1 day");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(observed.graph.data.map(reading => reading.timestamp)).toEqual(timestamps.slice(0, 2));
    expect(observed.graph.from).toBe((now + 10 - day) * 1000);
    await act(async () => vi.advanceTimersByTimeAsync(10000));
    await chooseDuration("1 week");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(observed.graph.data.map(reading => reading.timestamp)).toEqual(timestamps);
    await act(async () => vi.advanceTimersByTimeAsync(10000));
    await chooseDuration("1 hour");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(historyRequests()).toHaveLength(2);
});
