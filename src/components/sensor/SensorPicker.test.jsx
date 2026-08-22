import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const { Provider } = await import("../ui/provider");
const { system } = await import("../../themes");
const { SensorPicker } = await import("./SensorPicker");

let container;
let root;

beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

describe("SensorPicker", () => {
    it("renders with border outline and v2's label/caret trigger layout", async () => {
        const sensors = [
            { sensor: "sensor-1", name: "Living Room" },
            { sensor: "sensor-2", name: "Kitchen" },
        ];

        await act(async () => {
            root.render(
                <Provider>
                    <SensorPicker
                        sensors={sensors}
                        canBeSelected={sensors}
                        buttonText="Select sensors"
                        onSensorChange={() => {}}
                    />
                </Provider>,
            );
        });

        const button = container.querySelector("button");
        expect(button).toBeTruthy();

        // Recipe should define 1px solid border outline with buttonBg
        const buttonRecipe = system.getRecipe("button");
        expect(buttonRecipe.variants.variant.shareSensorSelect.borderWidth).toBe("1px");
        expect(buttonRecipe.variants.variant.shareSensorSelect.borderStyle).toBe("solid");
        expect(buttonRecipe.variants.variant.shareSensorSelect.borderColor).toContain("!important");
        expect(buttonRecipe.base.borderColor).toBe("transparent");

        expect(button.style.width).toBe("250px");
        expect(button.style.textAlign).toBe("left");

        // v2's MenuButton wrapped its children in a `flex: 1 0 auto` span when
        // used with `as={Button}`, which is what pinned the label to the start
        // of this 250px trigger and pushed the caret to the far edge.
        const label = button.firstElementChild;
        const rules = [...document.querySelectorAll("style")].map((el) => el.textContent).join("\n");
        const labelCls = [...label.classList].find((c) => c.startsWith("css-"));
        const labelRule = rules
            .split("}")
            .filter((r) => r.includes("." + labelCls))
            .join("}");
        expect(labelRule).toContain("flex:1 0 auto");
        expect(labelRule).toContain("min-width:0");

        const allCss = [...document.styleSheets]
            .flatMap((s) => {
                try {
                    return [...s.cssRules].map((r) => r.cssText);
                } catch {
                    return [];
                }
            })
            .join("\n");
        expect(allCss).toMatch(/border-color: rgb\(53, 173, 159\) !important/);
    });
});
