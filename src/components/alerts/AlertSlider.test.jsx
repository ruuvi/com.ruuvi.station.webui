import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// stand-in for the real slider: records the bounds it was rendered with and lets the
// test drive onChange / onFinalChange the way a drag would
let rendered = [];
let slider = null;
vi.mock("react-range", () => ({
    getTrackBackground: () => "",
    Range: (props) => {
        rendered.push({ min: props.min, max: props.max, values: props.values });
        slider = props;
        return null;
    }
}));

const AlertSlider = (await import("./AlertSlider")).default;

let container, root;

function render(value, onChange) {
    act(() => root.render(<AlertSlider type="temperature" value={value} onChange={onChange} />));
}

beforeEach(() => {
    rendered = [];
    slider = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

describe("AlertSlider extended range", () => {
    it("keeps the bounds frozen while dragging out of the extended range", () => {
        // -50 is below the normal -40 minimum, so the slider starts on the extended range
        let value = { min: -50, max: 0 };
        const onChange = (values, final) => {
            value = { min: values[0], max: values[1] };
            render(value, onChange);
            if (final) return;
        };
        render(value, onChange);
        expect(rendered[0]).toMatchObject({ min: -55, max: 150 });

        // drag the min thumb up until both values are inside the normal range
        act(() => slider.onChange([-30, 0]));
        expect(rendered[rendered.length - 1]).toMatchObject({ min: -55, max: 150, values: [-30, 0] });

        act(() => slider.onChange([-10, 0]));
        expect(rendered[rendered.length - 1]).toMatchObject({ min: -55, max: 150, values: [-10, 0] });

        // letting go collapses the slider back to the normal range
        act(() => slider.onFinalChange([-10, 0]));
        expect(rendered[rendered.length - 1]).toMatchObject({ min: -40, max: 85, values: [-10, 0] });
    });

    it("switches to the extended range once a drag inside it ends", () => {
        let value = { min: -10, max: 0 };
        const onChange = (values) => {
            value = { min: values[0], max: values[1] };
            render(value, onChange);
        };
        render(value, onChange);
        expect(rendered[0]).toMatchObject({ min: -40, max: 85 });

        act(() => slider.onChange([-40, 0]));
        expect(rendered[rendered.length - 1]).toMatchObject({ min: -40, max: 85, values: [-40, 0] });

        act(() => slider.onFinalChange([-40, 0]));
        expect(rendered[rendered.length - 1]).toMatchObject({ min: -40, max: 85, values: [-40, 0] });
    });
});
