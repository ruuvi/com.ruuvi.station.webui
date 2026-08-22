import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../graphs/Graph", () => ({ default: () => null }));
vi.mock("./SensorCardStats", () => ({ default: () => null }));

const SensorCardDetailed = (await import("./SensorCardDetailed")).default;
const { Provider } = await import("../ui/provider");

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
                <Provider>
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
                    </MemoryRouter>
                </Provider>,
            ),
        );

        expect(container.textContent).toContain("9.27");
    });

    it("renders background image with url() when showImage is true", () => {
        const t = (value) => value;
        const sensor = { sensor: "test-sensor", name: "Test sensor" };
        const pictureUrl = "https://example.com/sensor-photo.jpg";

        act(() =>
            root.render(
                <Provider>
                    <MemoryRouter>
                        <SensorCardDetailed
                            sensor={sensor}
                            size="medium"
                            showImage={true}
                            picture={pictureUrl}
                            showGraph={false}
                            latestReading={{ humidity: 50, temperature: 20 }}
                            mainStat="temperature"
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
                    </MemoryRouter>
                </Provider>,
            ),
        );

        const imageEl = container.querySelector(".imageBackgroundColor");
        expect(imageEl).toBeTruthy();
        const overlayEl = container.querySelector(".imageBackgroundOverlay");
        expect(overlayEl).toBeTruthy();

        const imageStyle = window.getComputedStyle(imageEl);
        expect(imageStyle.backgroundImage).toBe(`url("${pictureUrl}")`);

        const overlayStyle = window.getComputedStyle(overlayEl);
        expect(overlayStyle.backgroundImage).toContain("url(");
    });

    it("renders fallback overlay when showImage is true but sensor has no picture", () => {
        const t = (value) => value;
        const sensor = { sensor: "test-sensor", name: "Test sensor" };

        act(() =>
            root.render(
                <Provider>
                    <MemoryRouter>
                        <SensorCardDetailed
                            sensor={sensor}
                            size="medium"
                            showImage={true}
                            picture={undefined}
                            showGraph={false}
                            latestReading={{ humidity: 50, temperature: 20 }}
                            mainStat="temperature"
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
                    </MemoryRouter>
                </Provider>,
            ),
        );

        const imageEl = container.querySelector(".imageBackgroundColor");
        expect(imageEl).toBeTruthy();
        const overlayEl = container.querySelector(".imageBackgroundOverlay");
        expect(overlayEl).toBeTruthy();

        const imageStyle = window.getComputedStyle(imageEl);
        expect(["", "none"]).toContain(imageStyle.backgroundImage);

        const overlayStyle = window.getComputedStyle(overlayEl);
        expect(overlayStyle.backgroundImage).toContain("url(");
    });
});
