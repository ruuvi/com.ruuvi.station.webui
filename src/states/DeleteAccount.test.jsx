import React, { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DeleteAccount from "./DeleteAccount";
import { getDeletionEnvironment, readDeletionLink } from "../utils/verifyAccountDeletion";

const token = "a".repeat(43);
const progress = {
    status: "completed",
    account: "deleted",
    history: "in_progress",
    notifications: "completed",
    overall: "in_progress",
};
const response = (status, data, headers = {}) => ({
    status,
    headers: new Headers(headers),
    json: async () => ({ result: status < 400 ? "success" : "error", data }),
});
const pending = () => response(200, { status: "pending" });
let root, container, storedSession, cookies;
const render = async (options = {}) => {
    const link = readDeletionLink();
    if (options.hostname) link.environment = getDeletionEnvironment("", options.hostname);
    await act(async () =>
        root.render(
            options.strict ? (
                <StrictMode>
                    <DeleteAccount link={link} />
                </StrictMode>
            ) : (
                <DeleteAccount link={link} />
            ),
        ),
    );
};
const click = async (element) => act(async () => element.click());
const advance = async (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));
const checkbox = () => container.querySelector('input[type="checkbox"]');
const submit = () => container.querySelector('button[type="submit"]');
const confirm = async () => {
    await click(checkbox());
    await click(submit());
};
const confirmations = () => fetch.mock.calls.filter(([url]) => url.endsWith("/verify-delete"));

beforeEach(() => {
    vi.useFakeTimers();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, "", "/delete-account/?lng=fi#token=" + token);
    localStorage.setItem(
        "user",
        JSON.stringify({ email: "another-account@example.com", accessToken: "session-token" }),
    );
    localStorage.setItem("settings", JSON.stringify({ PROFILE_LANGUAGE_CODE: "fi" }));
    localStorage.setItem("env", "staging");
    sessionStorage.setItem("preserve", "session data");
    document.cookie = "station_user=pending-login; path=/";
    storedSession = { ...localStorage };
    cookies = document.cookie;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(pending()));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(() => {
    expect({ ...localStorage }).toEqual(storedSession);
    expect(sessionStorage.getItem("preserve")).toBe("session data");
    expect(document.cookie).toBe(cookies);
    if (root) act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "station_user=; max-age=0; path=/";
    window.history.replaceState(null, "", "/");
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

it.each(["?lng=fi&token=", "?lng=fi#token="])(
    "checks status but requires explicit confirmation (%s)",
    async (prefix) => {
        window.history.replaceState(null, "", "/delete-account/" + prefix + token);
        fetch.mockImplementation(async (url) => {
            expect(window.location.href).not.toContain(token);
            return url.endsWith("/status") ? pending() : response(200, progress);
        });
        await render();
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0]).toBe("https://network.ruuvi.com/verify-delete/status");
        expect(submit().disabled).toBe(true);
        await act(async () =>
            container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
        );
        expect(confirmations()).toHaveLength(0);
        await click(checkbox());
        expect(confirmations()).toHaveLength(0);
        expect(container.textContent).not.toContain("another-account@example.com");
        await click(submit());
        expect(confirmations()).toHaveLength(1);
        expect(confirmations()[0][1]).toMatchObject({
            method: "POST",
            body: JSON.stringify({ token }),
            credentials: "omit",
        });
        expect(container.querySelector("h1").textContent).toBe("Your account is deleted");
        expect(submit()).toBeNull();
    },
);

it("uses testnet for new dev email links with no env parameter", async () => {
    await render({ hostname: "devstation.ruuvi.com" });
    expect(container.textContent).toContain("Development environment");
    fetch.mockResolvedValue(response(200, progress));
    await confirm();
    expect(fetch.mock.calls.every(([url]) => url.startsWith("https://testnet.ruuvi.com/"))).toBe(true);
});

it.each(["env=", "env=staging", "env=dev&env=dev"])("rejects an invalid environment (%s)", async (query) => {
    window.history.replaceState(null, "", `/delete-account/?${query}#token=${token}`);
    await render();
    expect(container.textContent).toContain("invalid environment");
    expect(fetch).not.toHaveBeenCalled();
});

it.each(["", "?token=", "#token=a&token=b", "?token=a#token=b"])(
    "rejects incomplete or ambiguous links (%s)",
    async (suffix) => {
        window.history.replaceState(null, "", "/delete-account/" + suffix);
        await render();
        expect(container.textContent).toContain("link is incomplete");
        expect(fetch).not.toHaveBeenCalled();
    },
);

it.each([
    [400, "invalid_request", "no longer valid"],
    [404, "invalid", "no longer valid"],
    [410, "expired", "has expired"],
])("explains HTTP %s on initial lookup", async (http, status, text) => {
    fetch.mockResolvedValue(response(http, { status }));
    await render();
    expect(container.textContent).toContain(text);
    expect(submit()).toBeNull();
    await advance(60000);
    expect(fetch).toHaveBeenCalledTimes(1);
});

it("blocks duplicate confirmations while submitting", async () => {
    await render();
    let finish;
    fetch.mockReturnValue(
        new Promise((resolve) => {
            finish = resolve;
        }),
    );
    await click(checkbox());
    await act(async () => {
        const form = container.querySelector("form");
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(confirmations()).toHaveLength(1);
    expect(submit().disabled).toBe(true);
    expect(checkbox().disabled).toBe(true);
    expect(container.querySelector('button[type="button"]').disabled).toBe(true);
    await act(async () => finish(response(200, progress)));
    expect(container.textContent).toContain("Your account is deleted");
});

it("polls cleanup every 10 seconds and stops when everything is complete", async () => {
    fetch.mockResolvedValue(response(200, progress));
    await render();
    expect(submit()).toBeNull();
    await advance(9999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mockResolvedValue(response(200, { ...progress, history: "completed", overall: "completed" }));
    await advance(10000);
    expect(container.textContent).toContain("Account deletion completed");
    await advance(60000);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(confirmations()).toHaveLength(0);
});

it.each(["history", "notifications", "overall"])("stops and offers support when %s needs attention", async (part) => {
    fetch.mockResolvedValue(response(200, { ...progress, [part]: "needs_attention" }));
    await render();
    expect(container.textContent).toContain("Cleanup needs attention");
    expect(container.textContent).toContain("contact Ruuvi support");
    await advance(60000);
    expect(fetch).toHaveBeenCalledTimes(1);
});

it("retries a 202 confirmation only after Retry-After", async () => {
    await render();
    fetch
        .mockResolvedValueOnce(response(202, { status: "processing" }, { "Retry-After": "7" }))
        .mockResolvedValue(response(200, progress));
    await confirm();
    expect(container.textContent).toContain("Processing your confirmation");
    await advance(6999);
    expect(confirmations()).toHaveLength(1);
    await advance(1);
    expect(confirmations()).toHaveLength(2);
    expect(container.textContent).toContain("Your account is deleted");
});

it.each([false, true])("honors 429 before retrying the same request (confirmation=%s)", async (confirmation) => {
    if (confirmation) await render();
    fetch
        .mockResolvedValueOnce(response(429, undefined, { "Retry-After": "65" }))
        .mockResolvedValue(confirmation ? response(200, progress) : pending());
    if (confirmation) await confirm();
    else await render();
    const count = fetch.mock.calls.length;
    expect(container.textContent).toContain("Too many requests");
    expect(container.querySelector("button")).toBeNull();
    await advance(64999);
    expect(fetch).toHaveBeenCalledTimes(count);
    await advance(1);
    expect(fetch).toHaveBeenCalledTimes(count + 1);
    expect(fetch.mock.calls.at(-1)[0]).toBe(fetch.mock.calls.at(-2)[0]);
});

it.each(["network", 500, 503])(
    "checks status after uncertain/failed confirmation (%s) instead of claiming cancellation",
    async (failure) => {
        await render();
        if (failure === "network") fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        else
            fetch.mockResolvedValueOnce(
                response(failure, failure === 503 ? { status: "temporarily_failed" } : undefined),
            );
        await confirm();
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
        expect(container.textContent).not.toContain("No changes made");
        expect(container.textContent).not.toContain("Cancel");
        fetch.mockResolvedValue(response(200, progress));
        await click(container.querySelector("button"));
        expect(fetch.mock.calls.at(-1)[0]).toContain("/status");
        expect(confirmations()).toHaveLength(1);
        expect(container.textContent).toContain("Your account is deleted");
    },
);

it("preserves known deletion progress on polling failure and can resume checking", async () => {
    fetch.mockResolvedValueOnce(response(200, progress)).mockRejectedValueOnce(new TypeError("Offline"));
    await render();
    await advance(10000);
    expect(container.textContent).toContain("Your account is deleted");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    fetch.mockResolvedValue(response(200, { ...progress, history: "completed", overall: "completed" }));
    await click(container.querySelector("button"));
    expect(container.textContent).toContain("Account deletion completed");
});

it("cancels a pending request without confirming deletion", async () => {
    await render();
    await click(container.querySelector('button[type="button"]'));
    expect(container.textContent).toContain("No changes made");
    await advance(60000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(confirmations()).toHaveLength(0);
});

it("works signed out and in StrictMode without losing the captured token", async () => {
    localStorage.clear();
    storedSession = {};
    await render({ strict: true });
    expect(submit().disabled).toBe(true);
    expect(confirmations()).toHaveLength(0);
    expect(fetch.mock.calls.every(([, options]) => JSON.parse(options.body).token === token)).toBe(true);
});

it("aborts pending requests on unmount and ignores late responses", async () => {
    let finish;
    fetch.mockReturnValue(
        new Promise((resolve) => {
            finish = resolve;
        }),
    );
    await render();
    const signal = fetch.mock.calls[0][1].signal;
    act(() => root.unmount());
    root = null;
    expect(signal.aborted).toBe(true);
    await act(async () => finish(response(200, progress)));
    await advance(60000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
});

it("clears scheduled confirmation retries on unmount", async () => {
    await render();
    fetch.mockResolvedValue(response(202, { status: "processing" }));
    await confirm();
    act(() => root.unmount());
    root = null;
    await advance(60000);
    expect(confirmations()).toHaveLength(1);
});

it("does not promise cancellation after an uncertain confirmation even if status is still pending", async () => {
    await render();
    fetch.mockRejectedValueOnce(new TypeError("Offline"));
    await confirm();
    fetch.mockResolvedValue(pending());
    await click(container.querySelector("button"));
    await click(container.querySelector('button[type="button"]'));
    expect(container.textContent).toContain("Closing this page does not cancel a submitted deletion");
    expect(container.textContent).not.toContain("No changes made");
    expect(confirmations()).toHaveLength(1);
});
