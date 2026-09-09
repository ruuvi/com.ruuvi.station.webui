import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    loaded: vi.fn(),
    save: vi.fn(),
    font: vi.fn(),
    imageFails: false,
}));

function mockPDFDependencies() {
    vi.doMock("jspdf", () => {
        mocks.loaded();
        return {
            default: class {
                setTextColor() {}
                setFontSize() {}
                setFont() {}
                setDrawColor() {}
                setLineWidth() {}
                roundedRect() {}
                line() {}
                text() {}
                addImage() {}
                getTextWidth() { return 10; }
                getTextDimensions() { return { w: 10, h: 5 }; }
                save(name) { mocks.save(name); }
            },
        };
    });
    vi.doMock("./fonts/Montserrat", () => ({ default: mocks.font }));
    vi.doMock("./fonts/Oswald", () => ({ default: mocks.font }));
    vi.doMock("./fonts/Mulish", () => ({ default: mocks.font }));
}

vi.mock("./alertHelper", () => ({ hasAlertBeenHit: () => false }));

let exportPDF;

const measurements = [
    { timestamp: 1700000000, parsed: { temperature: 20 } },
    { timestamp: 1700000060, parsed: { temperature: 22 } },
];

function startExport(done, chartRef = { current: { querySelector: () => ({ toDataURL: () => "data:image/png;base64,test" }) } }) {
    return exportPDF(
        { name: "Office", alerts: [] }, { measurements }, measurements,
        "temperature", 1700000000000, 1700000060000, chartRef, key => key, done,
    );
}

beforeEach(async () => {
    vi.resetModules();
    mocks.loaded.mockClear();
    mocks.font.mockClear();
    mockPDFDependencies();
    ({ exportPDF } = await import("./export"));
    vi.useFakeTimers();
    mocks.imageFails = false;
    mocks.save.mockReset();
    vi.stubGlobal("Image", class {
        set src(_value) {
            if (mocks.imageFails) this.onerror();
            else this.onload();
        }
    });
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    for (const path of ["jspdf", "./fonts/Montserrat", "./fonts/Oswald", "./fonts/Mulish"]) vi.doUnmock(path);
    vi.resetModules();
});

async function renderGraph() {
    await vi.dynamicImportSettled();
    await vi.advanceTimersByTimeAsync(500);
}

describe("on-demand PDF export", () => {
    it("does not load jsPDF until export, waits for graph rendering, and reuses font registration", async () => {
        expect(mocks.loaded).not.toHaveBeenCalled();
        const done = vi.fn();
        const first = startExport(done);
        await vi.dynamicImportSettled();
        expect(mocks.loaded).toHaveBeenCalledTimes(1);
        expect(mocks.save).not.toHaveBeenCalled();
        expect(done).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(500);
        await first;
        expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(/^Office_.*\.pdf$/));
        expect(done).toHaveBeenCalledTimes(1);
        expect(mocks.font).toHaveBeenCalledTimes(3);

        const second = startExport(done);
        await renderGraph();
        await second;
        expect(mocks.save).toHaveBeenCalledTimes(2);
        expect(mocks.font).toHaveBeenCalledTimes(3);
        expect(done).toHaveBeenCalledTimes(2);
    });

    it("restores the graph when image loading fails", async () => {
        mocks.imageFails = true;
        const done = vi.fn();
        const result = expect(startExport(done)).rejects.toThrow("Could not load the graph image");
        await renderGraph();
        await result;
        expect(done).toHaveBeenCalledTimes(1);
        expect(mocks.save).not.toHaveBeenCalled();
    });

    it("restores the graph when saving fails", async () => {
        mocks.save.mockImplementation(() => { throw new Error("save failed"); });
        const done = vi.fn();
        const result = expect(startExport(done)).rejects.toThrow("save failed");
        await renderGraph();
        await result;
        expect(done).toHaveBeenCalledTimes(1);
    });

    it("restores the graph if its canvas disappears before capture", async () => {
        const done = vi.fn();
        const result = expect(startExport(done, { current: null })).rejects.toThrow();
        await renderGraph();
        await result;
        expect(done).toHaveBeenCalledTimes(1);
        expect(mocks.save).not.toHaveBeenCalled();
    });

    it("restores the graph when a lazy dependency fails to load", async () => {
        vi.doMock("./fonts/Montserrat", () => { throw new Error("chunk download failed"); });
        try {
            const { exportPDF: freshExportPDF } = await import("./export");
            const done = vi.fn();
            await expect(freshExportPDF({}, {}, [], "temperature", 0, 0, {}, key => key, done))
                .rejects.toThrow();
            expect(done).toHaveBeenCalledTimes(1);
            expect(mocks.save).not.toHaveBeenCalled();
        } finally {
            vi.doUnmock("./fonts/Montserrat");
        }
    });
});
