import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../graphs/Graph", () => ({ default: () => null }));
vi.mock("./SensorCardStats", () => ({ default: () => null }));

const SensorCardDetailed = (await import("./SensorCardDetailed")).default;

let container;
let root;

beforeEach(() => {
    localStorage.setItem(
        "settings",
        JSON.stringify({
            UNIT_HUMIDITY: "0",
            UNIT_TEMPERATURE: "C",
            ACCURACY_HUMIDITY_RELATIVE: "0",
            ACCURACY_HUMIDITY_DEW_POINT: "2",
        }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
});

describe("SensorCardDetailed main value", () => {
    it("keeps dew-point resolution when the dashboard selects the dew-point variant", () => {
        const t = (value) => value;
        const sensor = { sensor: "test-sensor", name: "Test sensor" };
        const latestReading = { humidity: 50, temperature: 20 };

        act(() =>
            root.render(
                <MemoryRouter>
                    <SensorCardDetailed
                        sensor={sensor}
                        size="medium"
                        showImage={false}
                        showGraph={false}
                        latestReading={latestReading}
                        mainStat="humidity"
                        mainStatUnitKey="2"
                        data={null}
                        hasDataForTypes={[]}
                        measurements={[]}
                        loading={false}
                        loadingHistory={false}
                        errorFetchingData={false}
                        renderNoData={() => null}
                        noHistoryStr=""
                        infoRow={null}
                        smallDataFields={[]}
                        smallDataMinHeight={0}
                        getAlertState={() => -1}
                        getAlertForGraph={() => null}
                        dataFrom={1}
                        t={t}
                    />
                </MemoryRouter>,
            ),
        );

        expect(container.textContent).toContain("9.27");
    });
});
