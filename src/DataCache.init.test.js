import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(), clear: vi.fn(), removeItem: vi.fn() }));
vi.mock("localforage", () => storage);
vi.mock("./utils/logger", () => ({ default: { error: vi.fn() } }));
let cache;
beforeEach(async () => {
    vi.resetModules();
    for (const mock of Object.values(storage)) mock.mockReset();
    ({ default: cache } = await import("./DataCache"));
});

describe("cache initialization barrier", () => {
    it("holds concurrent reads and writes until stale storage has been cleared", async () => {
        let finishVersion;
        let finishClear;
        storage.getItem.mockImplementation(key => key === "cacheVersion"
            ? new Promise(resolve => { finishVersion = resolve; }) : "fresh");
        storage.clear.mockImplementation(() => new Promise(resolve => { finishClear = resolve; }));
        const read = cache.getData("sensor", "mixed");
        const write = cache.setData("sensor", "mixed", { measurements: [] });
        const init = cache.init();
        expect(cache.init()).toBe(init);
        expect(storage.getItem).toHaveBeenCalledTimes(1);
        finishVersion(1);
        await Promise.resolve();
        expect(storage.clear).toHaveBeenCalledTimes(1);
        expect(storage.setItem).not.toHaveBeenCalled();
        expect(storage.getItem).toHaveBeenCalledTimes(1);
        finishClear();
        await expect(read).resolves.toBe("fresh");
        await write;
        expect(storage.setItem.mock.calls[0]).toEqual(["cacheVersion", 2]);
        expect(storage.setItem.mock.calls[1][0]).toBe("cache_sensor_mixed");
    });

    it("retries initialization after a storage failure", async () => {
        storage.getItem.mockRejectedValueOnce(new Error("storage unavailable")).mockResolvedValue(2);
        await expect(cache.init()).rejects.toThrow("storage unavailable");
        await cache.init();
        expect(storage.getItem).toHaveBeenCalledTimes(2);
        expect(storage.clear).not.toHaveBeenCalled();
    });

    it("holds new reads until an explicit clear finishes", async () => {
        storage.getItem.mockResolvedValue(2);
        await cache.init();
        storage.getItem.mockClear();
        let finishClear;
        storage.clear.mockImplementation(() => new Promise(resolve => { finishClear = resolve; }));
        const clearing = cache.clear();
        const read = cache.getData("sensor", "mixed");
        await Promise.resolve();
        await Promise.resolve();
        expect(storage.getItem).not.toHaveBeenCalled();
        finishClear();
        await clearing;
        await read;
        expect(storage.getItem).toHaveBeenCalledTimes(1);
    });
});
