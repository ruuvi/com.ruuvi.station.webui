import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getPublicResponse, savePublicResponse } from "./PublicDataCache";

const prefix = "public-sensor-response:";
const response = { result: "success", data: { measurements: [] } };

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 10, 13));
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
});

it("prunes expired entries while retaining fresh ranges and unrelated session data", () => {
    sessionStorage.setItem("unrelated", "keep");
    savePublicResponse("expired", response);
    vi.advanceTimersByTime(10000);
    savePublicResponse("fresh", response);
    vi.advanceTimersByTime(20000);
    savePublicResponse("new", response);
    expect(sessionStorage.getItem(prefix + "expired")).toBeNull();
    expect(getPublicResponse("fresh")).toEqual(response);
    expect(getPublicResponse("new")).toEqual(response);
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
});

it("discards corrupt and expired entries when read", () => {
    sessionStorage.setItem(prefix + "corrupt", "not JSON");
    expect(getPublicResponse("corrupt")).toBeNull();
    expect(sessionStorage.getItem(prefix + "corrupt")).toBeNull();
    savePublicResponse("expired", response);
    vi.advanceTimersByTime(30000);
    expect(getPublicResponse("expired")).toBeNull();
    expect(sessionStorage.getItem(prefix + "expired")).toBeNull();
});

it("treats unavailable storage as a cache miss", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("disabled"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("disabled"); });
    expect(getPublicResponse("test")).toBeNull();
});

it("does not fail a request when the response exceeds the storage quota", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Full", "QuotaExceededError");
    });
    expect(() => savePublicResponse("test", response)).not.toThrow();
    expect(getPublicResponse("test")).toBeNull();
});
