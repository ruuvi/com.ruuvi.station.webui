import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let isLarge = false;
vi.mock("../hooks/useIsLargeDisplay", () => ({
    default: () => isLarge,
}));
vi.mock("../common/DurationText", () => ({
    default: () => <span data-testid="duration-text">Duration</span>,
}));
vi.mock("../common/NavClose", () => ({
    default: () => <span data-testid="nav-close">Close</span>,
}));
vi.mock("../common/NavPrevNext", () => ({
    default: () => <span data-testid="nav-prev-next">PrevNext</span>,
}));

const SensorHeader = (await import("./SensorHeader")).default;
const { Provider } = await import("../ui/provider");

let container;
let root;

beforeEach(() => {
    isLarge = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

describe("SensorHeader mobile view", () => {
    it("allows the public sensor name to grow to 100% width on mobile", () => {
        const sensor = { sensor: "test-sensor", name: "Public Greenhouse Sensor" };
        const t = (k) => k;

        act(() =>
            root.render(
                <Provider>
                    <MemoryRouter>
                        <SensorHeader
                            sensor={sensor}
                            t={t}
                            isPublic={true}
                            lastUpdateTime={Date.now()}
                            isAlertTriggered={() => false}
                        />
                    </MemoryRouter>
                </Provider>
            )
        );

        const titleEl = container.querySelector(".mobilePageTitle");
        expect(titleEl).not.toBeNull();
        const parentDiv = titleEl.parentElement;
        expect(parentDiv.style.width).toBe("100%");
    });

    it("keeps 65% width on mobile when not public", () => {
        const sensor = { sensor: "test-sensor", name: "Private Sensor" };
        const t = (k) => k;

        act(() =>
            root.render(
                <Provider>
                    <MemoryRouter>
                        <SensorHeader
                            sensor={sensor}
                            t={t}
                            isPublic={false}
                            lastUpdateTime={Date.now()}
                            isAlertTriggered={() => false}
                        />
                    </MemoryRouter>
                </Provider>
            )
        );

        const titleEl = container.querySelector(".mobilePageTitle");
        expect(titleEl).not.toBeNull();
        const parentDiv = titleEl.parentElement;
        expect(parentDiv.style.width).toBe("65%");
    });

    it("applies hyphenation and word-break styles to mobilePageTitle", () => {
        const sensor = { sensor: "test-sensor", name: "LongSensorName" };
        const t = (k) => k;

        act(() =>
            root.render(
                <Provider>
                    <MemoryRouter>
                        <SensorHeader
                            sensor={sensor}
                            t={t}
                            isPublic={true}
                            lastUpdateTime={Date.now()}
                            isAlertTriggered={() => false}
                        />
                    </MemoryRouter>
                </Provider>
            )
        );

        const titleEl = container.querySelector(".mobilePageTitle");
        expect(titleEl.style.hyphens).toBe("auto");
        expect(titleEl.style.overflowWrap).toBe("break-word");
    });
});
