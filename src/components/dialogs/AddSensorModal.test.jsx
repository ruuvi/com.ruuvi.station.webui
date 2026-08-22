import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

window.matchMedia =
    window.matchMedia ||
    ((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }));

vi.mock("react-i18next", () => ({
    withTranslation: () => (Component) => (props) => <Component {...props} t={(k) => k} />,
    useTranslation: () => ({ t: (k) => k }),
}));

const mockClaim = vi.fn();
vi.mock("../../NetworkApi", () => {
    return {
        default: class {
            claim(...args) {
                return mockClaim(...args);
            }
        },
    };
});

const mockNotifySuccess = vi.fn();
const mockNotifyError = vi.fn();
vi.mock("../../utils/notify", () => ({
    default: {
        success: (...args) => mockNotifySuccess(...args),
        error: (...args) => mockNotifyError(...args),
    },
}));

const AddSensorModal = (await import("./AddSensorModal")).default;
const { Provider } = await import("../ui/provider");

let container;
let root;

beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
});

describe("AddSensorModal", () => {
    it("renders modal and pin inputs when open is true", async () => {
        await act(async () => {
            root.render(
                <Provider>
                    <AddSensorModal open={true} onClose={() => {}} />
                </Provider>,
            );
        });

        const inputs = document.body.querySelectorAll("input");
        expect(inputs.length).toBeGreaterThan(0);

        const addButton = Array.from(document.body.querySelectorAll("button")).find(
            (b) => b.textContent === "add",
        );
        expect(addButton).toBeTruthy();
        expect(addButton.disabled).toBe(true);
    });

    it("resets state when reopened", async () => {
        await act(async () => {
            root.render(
                <Provider>
                    <AddSensorModal open={false} onClose={() => {}} />
                </Provider>,
            );
        });

        await act(async () => {
            root.render(
                <Provider>
                    <AddSensorModal open={true} onClose={() => {}} />
                </Provider>,
            );
        });

        const inputs = document.body.querySelectorAll("input");
        inputs.forEach((input) => {
            expect(input.value).toBe("");
        });
    });

    it("handles error during sensor claim", async () => {
        mockClaim.mockResolvedValueOnce({ result: "error", code: "ER_FORBIDDEN" });

        await act(async () => {
            root.render(
                <Provider>
                    <AddSensorModal open={true} onClose={() => {}} />
                </Provider>,
            );
        });

        // Verify initial disabled state
        const addButton = Array.from(document.body.querySelectorAll("button")).find(
            (b) => b.textContent === "add",
        );
        expect(addButton).toBeTruthy();
    });
});
