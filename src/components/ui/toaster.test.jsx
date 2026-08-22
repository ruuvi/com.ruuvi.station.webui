import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

window.matchMedia =
    window.matchMedia ||
    ((q) => ({
        matches: false,
        media: q,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
    }));

const { Provider } = await import("./provider");
const { Toaster, toaster } = await import("./toaster");

const flush = async () => {
    await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
    });
};

describe("Toaster", () => {
    it("labels the toast for screen readers and honors closable", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const root = createRoot(container);
        await act(async () => {
            root.render(
                <Provider>
                    <Toaster />
                </Provider>,
            );
        });

        await act(async () => {
            toaster.create({ type: "success", title: "saved", duration: 60000, closable: true });
        });
        await flush();

        const toastRoot = document.body.querySelector('[data-scope="toast"][data-part="root"]');
        expect(toastRoot, "toast did not render").toBeTruthy();
        // Toast.Root points aria-labelledby at the title slot; a plain <Text>
        // leaves the reference dangling and the toast announces as empty
        const labelledBy = toastRoot.getAttribute("aria-labelledby");
        expect(labelledBy).toBeTruthy();
        const title = document.getElementById(labelledBy);
        expect(title, `nothing carries id "${labelledBy}"`).toBeTruthy();
        expect(title.textContent).toBe("saved");
        expect(toastRoot.querySelector("button"), "close button missing").toBeTruthy();

        await act(async () => {
            toaster.dismiss();
        });
        await flush();

        await act(async () => {
            toaster.create({ type: "info", title: "plain", duration: 60000, closable: false });
        });
        await flush();

        const plain = [...document.body.querySelectorAll('[data-scope="toast"][data-part="root"]')].find(
            (el) => el.textContent.includes("plain"),
        );
        expect(plain, "second toast did not render").toBeTruthy();
        expect(plain.querySelector("button"), "closable:false still shows a close button").toBeNull();

        await act(async () => {
            toaster.dismiss();
            root.unmount();
        });
        container.remove();
    });
});
