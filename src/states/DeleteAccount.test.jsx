import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DeleteAccount from "./DeleteAccount";

let root, container, storedSession, cookies;
const render = async () => {
    await act(async () => root.render(<DeleteAccount />));
};
const click = async (element) => {
    await act(async () => element.click());
};
const checkbox = () => container.querySelector('input[type="checkbox"]');
const submit = () => container.querySelector('button[type="submit"]');

beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, "", "/delete-account?token=email-token&lng=fi");
    localStorage.setItem(
        "user",
        JSON.stringify({ email: "another-account@example.com", accessToken: "session-token" }),
    );
    localStorage.setItem("settings", JSON.stringify({ PROFILE_LANGUAGE_CODE: "fi" }));
    localStorage.setItem("chakra-ui-color-mode", "dark");
    localStorage.setItem("env", "staging");
    sessionStorage.setItem("preserve", "session data");
    document.cookie = "station_user=pending-login; path=/";
    document.cookie = "station_status=signedIn; path=/";
    storedSession = { ...localStorage };
    cookies = document.cookie;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    // Every UI path must preserve the unrelated signed-in account and settings.
    expect({ ...localStorage }).toEqual(storedSession);
    expect(sessionStorage.getItem("preserve")).toBe("session data");
    expect(document.cookie).toBe(cookies);
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "station_user=; max-age=0; path=/";
    document.cookie = "station_status=; max-age=0; path=/";
    window.history.replaceState(null, "", "/");
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

it("makes no request on load or acknowledgement and requires an explicit confirmation", async () => {
    await render();
    expect(fetch).not.toHaveBeenCalled();
    expect(submit().disabled).toBe(true);
    // Even a manually dispatched submit cannot bypass the acknowledgement.
    await act(async () =>
        container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    expect(fetch).not.toHaveBeenCalled();
    await click(checkbox());
    expect(submit().disabled).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("another-account@example.com");
    await click(submit());
    expect(fetch.mock.calls[0][0]).toBe("https://network.ruuvi.com/verify-delete?token=email-token");
    expect(fetch.mock.calls[0][1].credentials).toBe("omit");
    expect(container.querySelector("h1").textContent).toBe("Account deletion has started");
    expect(submit()).toBeNull();
    expect(document.activeElement).toBe(container.querySelector("h1"));
});

it("blocks duplicate submissions and cancel while the request is in flight", async () => {
    let finish;
    fetch.mockReturnValue(
        new Promise((resolve) => {
            finish = resolve;
        }),
    );
    await render();
    await click(checkbox());
    await act(async () => {
        const form = container.querySelector("form");
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(submit().disabled).toBe(true);
    expect(checkbox().disabled).toBe(true);
    expect(container.querySelector('button[type="button"]').disabled).toBe(true);
    expect(container.querySelector('[role="status"]').textContent).toContain("Please wait");
    await act(async () => finish({ status: 200 }));
    expect(container.querySelector("h1").textContent).toBe("Account deletion has started");
});

it.each(["/delete-account", "/delete-account?token=", "/delete-account?token=a&token=b"])(
    "offers a recovery path without deletion for %s",
    async (path) => {
        window.history.replaceState(null, "", path);
        await render();
        expect(container.querySelector("h1").textContent).toBe("Your deletion link is incomplete");
        expect(submit()).toBeNull();
        expect(container.querySelector('a[href="mailto:support@ruuvi.com"]')).not.toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    },
);

it("explains a rejected link without retrying or changing authentication", async () => {
    fetch.mockResolvedValue({ status: 403 });
    await render();
    await click(checkbox());
    await click(submit());
    expect(container.querySelector("h1").textContent).toBe("This link is no longer valid");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(submit()).toBeNull();
});

it.each(["network", "server", "unauthorized"])(
    "shows a recoverable %s error and retries only on request",
    async (error) => {
        if (error === "network") fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        else fetch.mockResolvedValueOnce({ status: error === "server" ? 500 : 401 });
        await render();
        await click(checkbox());
        await click(submit());
        const alert = container.querySelector('[role="alert"]');
        expect(alert.textContent).toContain("We couldn’t confirm deletion");
        expect(document.activeElement).toBe(alert);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(submit().disabled).toBe(false);
        expect(submit().textContent).toContain("Try again");
        await click(submit());
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(container.querySelector("h1").textContent).toBe("Account deletion has started");
    },
);

it("cancels without contacting the API", async () => {
    await render();
    await click(container.querySelector('button[type="button"]'));
    expect(container.querySelector("h1").textContent).toBe("No changes made");
    expect(submit()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
});

it("does not claim cancellation after a request with an unknown outcome", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await render();
    await click(checkbox());
    await click(submit());
    await click(container.querySelector('button[type="button"]'));
    expect(container.querySelector("h1").textContent).toBe("Deletion status unconfirmed");
    expect(container.textContent).toContain("Deletion may already be in progress");
    expect(fetch).toHaveBeenCalledTimes(1);
});

it("also works when signed out", async () => {
    localStorage.clear();
    storedSession = {};
    await render();
    await click(checkbox());
    await click(submit());
    expect(container.querySelector("h1").textContent).toBe("Account deletion has started");
});
