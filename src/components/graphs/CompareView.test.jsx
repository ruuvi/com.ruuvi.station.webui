import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NetworkApi from "../../NetworkApi";
import UplotReact from "uplot-react";

vi.mock("uplot-react", () => ({ default: vi.fn(() => null) }));
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
await import("../../i18n");
const { Provider } = await import("../ui/provider");
const { default: CompareView } = await import("./CompareView");

const packet = "0201061BFF99040512FC5394C37C0004FFFC040CAC364200CDCBB8334C884F";
const page = (timestamps, extra) => ({
    result: "success",
    data: { measurements: timestamps.map(timestamp => ({ timestamp, data: packet, rssi: -60 })), ...extra },
});

let root, api, props;
beforeEach(() => {
    root = createRoot(document.createElement("div"));
    api = vi.spyOn(NetworkApi.prototype, "getAsync").mockResolvedValue(page([]));
    props = { sensors: ["a"], from: 100, to: 200, isLoading: vi.fn(), setData: vi.fn() };
});
afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
});
const render = () => act(async () => root.render(<Provider><CompareView {...props} /></Provider>));

it("keeps the selected time axis when an empty page precedes cached history on reload", async () => {
    let finishCacheRead;
    api.mockResolvedValueOnce(page([], { nextUp: 190 }))
        .mockImplementationOnce(() => new Promise(resolve => { finishCacheRead = resolve; }));
    await render();
    const emptyChart = UplotReact.mock.lastCall[0];
    expect(emptyChart.data[0]).toEqual([]);
    // uPlot requests an automatic scale with null bounds while the cache read is pending.
    act(() => { emptyChart.options.scales.x.range(null, null, null); });

    await act(async () => finishCacheRead(page([185, 180], { fromCache: true })));
    const { data, options } = UplotReact.mock.lastCall[0];
    expect(data[0]).toEqual([180, 185]);
    let axis;
    act(() => { axis = options.scales.x.range(null, data[0][0], data[0].at(-1)); });
    expect(axis).toEqual([props.from, props.to]);
});
