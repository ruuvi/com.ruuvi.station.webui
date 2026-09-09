import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NetworkApi from "../../NetworkApi";
import useSensorData from "./useSensorData";

vi.mock("../../decoder/parser", () => ({ default: data => data }));

const sensor = id => ({ sensor: id, measurements: [], subscription: { maxHistoryDays: 7 } });
const result = id => ({ result: "success", data: { sensor: id, measurements: [] } });
let root, container, latest, requests;
function Harness({ sensor }) {
    latest = useSensorData(sensor, 24);
    return null;
}

beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    requests = [];
    vi.spyOn(NetworkApi.prototype, "getAsync").mockImplementation((_id, _since, _until, _settings, signal) =>
        new Promise((resolve, reject) => requests.push({ resolve, reject, signal })));
    container = document.createElement("div");
    root = createRoot(container);
});
afterEach(async () => {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("superseded sensor history", () => {
    it.each([
        ["success", false], ["error", false], ["rejection", false],
        ["success", true], ["error", true], ["rejection", true],
    ])("ignores stale %s (new history already loaded: %s)", async (outcome, newLoaded) => {
        await act(async () => root.render(<Harness sensor={sensor("old")} />));
        await act(async () => root.render(<Harness sensor={sensor("new")} />));
        expect(requests[0].signal.aborted).toBe(true);
        if (newLoaded) await act(async () => requests[1].resolve(result("new")));
        await act(async () => {
            if (outcome === "success") requests[0].resolve(result("old"));
            else if (outcome === "error") requests[0].resolve({ result: "error", error: new Error("stale error") });
            else requests[0].reject(new Error("stale rejection"));
        });
        expect(latest.errorFetchingData).toBe(false);
        expect(latest.loading).toBe(!newLoaded);
        expect(latest.data?.sensor).toBe(newLoaded ? "new" : undefined);
        if (!newLoaded) await act(async () => requests[1].resolve(result("new")));
        expect(latest.data.sensor).toBe("new");
        expect(latest.loading).toBe(false);
    });
});
