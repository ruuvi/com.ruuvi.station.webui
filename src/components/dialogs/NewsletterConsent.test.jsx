import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NewsletterConsent from "./NewsletterConsent";

const api = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("../../NetworkApi", () => ({ default: class {
    getNewsletterSubscription() { return api.get(); }
    setNewsletterSubscription(value, language) { return api.set(value, language); }
} }));
vi.mock("@chakra-ui/react", () => ({
    Box: ({ children, role }) => <div role={role}>{children}</div>,
    Flex: ({ children }) => <div>{children}</div>,
    Switch: {
        Root: ({ checked, disabled, onCheckedChange }) => <button data-switch aria-checked={checked} disabled={disabled} onClick={() => onCheckedChange({ checked: !checked })} />,
        HiddenInput: () => null, Control: () => null,
    },
}));
const state = status => ({ result: "success", data: { status, consent: status === "subscribed" } });
let root, container;
const render = async () => { await act(async () => root.render(<NewsletterConsent t={key => key} language="fi" />)); };
const toggle = () => container.querySelector("[data-switch]");
beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    api.get.mockReset().mockResolvedValue(state("not_found"));
    api.set.mockReset();
    container = document.createElement("div");
    root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); });
it("disables overlapping saves and applies pending confirmation as a successful state", async () => {
    let finish;
    api.set.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    await render();
    await act(async () => toggle().click());
    expect(toggle().disabled).toBe(true);
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    await act(async () => { toggle().click(); finish(state("unconfirmed")); });
    expect(api.set).toHaveBeenCalledTimes(1);
    expect(api.set).toHaveBeenCalledWith(true, "fi");
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(toggle().disabled).toBe(true);
    await act(async () => toggle().click());
    expect(api.set).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("newsletter_subscription_confirmation");
    expect(container.querySelector('[role="alert"]')).toBeNull();
});
it("refreshes after a failed save and uses the actual committed state", async () => {
    await render();
    api.set.mockRejectedValue(new Error("timeout"));
    api.get.mockResolvedValue(state("subscribed"));
    await act(async () => toggle().click());
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(toggle().getAttribute("aria-checked")).toBe("true");
    expect(container.textContent).toContain("something_went_wrong");
});
it("quietly disables the switch if post-save recovery also fails", async () => {
    await render();
    api.set.mockRejectedValue(new Error("timeout"));
    api.get.mockRejectedValue(new Error("offline"));
    await act(async () => toggle().click());
    expect(toggle().disabled).toBe(true);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("button:not([data-switch])")).toBeNull();
    await act(async () => toggle().click());
    expect(api.set).toHaveBeenCalledTimes(1);
});
it("keeps an unavailable endpoint separate from declined consent", async () => {
    api.get.mockRejectedValue(new Error("404"));
    await render();
    expect(toggle().disabled).toBe(true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("button:not([data-switch])")).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
});
it.each(["subscribed", "unconfirmed", "unsubscribed", "not_found", "bounced", "soft_bounced", "complained"])("shows the existing on/off label for %s", async status => {
    api.get.mockResolvedValue(state(status));
    await render();
    expect(container.querySelector('[role="status"]').textContent).toBe(status === "subscribed" ? "on" : "off");
    expect(toggle().getAttribute("aria-checked")).toBe(String(status === "subscribed"));
    expect(toggle().disabled).toBe(status === "unconfirmed");
});
