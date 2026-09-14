import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NetworkApi from "./NetworkApi";

const success = (status) => ({ result: "success", data: { consent: status === "subscribed", status } });
beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ accessToken: "test-token", email: "private@example.com" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => success("unconfirmed") }));
});
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it("reads consent from the existing API with authentication and no body", async () => {
    await new NetworkApi().getNewsletterSubscription();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://network.ruuvi.com/marketing-consent");
    expect(options.method).toBe("GET");
    expect(options.headers.get("Authorization")).toBe("Bearer test-token");
    expect(options.headers.get("Content-Type")).toBe("application/json");
    expect(options.body).toBeUndefined();
});
it.each([true, false])("posts required subscriber fields for consent %s and preserves the returned state", async consent => {
    const result = await new NetworkApi().setNewsletterSubscription(consent);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ consent, silent: true, joiningSource: "web", language: "EN" });
    expect(fetch.mock.calls[0][1].method).toBe("POST");
    expect(result).toEqual(success("unconfirmed"));
});
it.each([
    ["DE", "DE"], ["en-GB", "EN"], ["fi_FI", "FI"], [" sv ", "SV"], ["Base", "EN"], ["", "EN"],
])("normalizes subscriber language %s to %s", async (language, expected) => {
    await new NetworkApi().setNewsletterSubscription(true, language);
    expect(JSON.parse(fetch.mock.calls[0][1].body).language).toBe(expected);
});
it.each(["subscribed", "unconfirmed", "unsubscribed", "not_found", "bounced", "soft_bounced", "complained"])("accepts %s", async status => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => success(status) });
    expect(await new NetworkApi().getNewsletterSubscription()).toEqual(success(status));
});
it("rejects invalid consent without a request", async () => {
    await expect(new NetworkApi().setNewsletterSubscription("true")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
});
it("does not convert unavailable or malformed responses to declined consent", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(new NetworkApi().getNewsletterSubscription()).rejects.toMatchObject({ status: 404 });
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ result: "success", data: {} }) });
    await expect(new NetworkApi().getNewsletterSubscription()).rejects.toThrow();
});
