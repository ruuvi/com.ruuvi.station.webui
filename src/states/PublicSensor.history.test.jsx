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
const now = cachedUntil + 60;
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
});

it("fetches seven days in seconds after changing the real dropdown, despite a recent cache and throttling", async () => {
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
    expect(historyRequests().slice(previousRequests)).toEqual([
        { since, until: now },
        { since, until: now - 1801 },
    ]);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Too many requests");
    expect(localStorage.getItem("graph_from")).toBe(String(7 * 24));

    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(historyRequests().slice(previousRequests)).toEqual([
        { since, until: now },
        { since, until: now - 1801 },
        { since: since + 60, until: now - 3 * day - 1 },
        { since: since + 60, until: now - 6 * day - 1 },
    ]);
    const timestamps = observed.graph.data.map(reading => reading.timestamp);
    expect(timestamps).toContain(now - 5 * day);
    expect(timestamps.at(-1)).toBe(now - 6 * day);
    expect(timestamps).not.toContain(now - 8 * day);
    expect(observed.graph.from).toBe((since + 60) * 1000);
    expect(container.querySelector('[role="status"]')).toBeNull();
});
