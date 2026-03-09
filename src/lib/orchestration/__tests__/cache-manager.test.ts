import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CacheManager } from "../cache-manager";

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new CacheManager({ defaultTtlMs: 60_000, maxEntries: 5 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves values", () => {
    cache.set("key1", { data: "hello" });
    expect(cache.get("key1")).toEqual({ data: "hello" });
  });

  it("returns null for missing keys", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("expires entries after TTL", () => {
    cache.set("key1", "value1");

    vi.advanceTimersByTime(59_999);
    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(2);
    expect(cache.get("key1")).toBeNull();
  });

  it("supports custom TTL per entry", () => {
    cache.set("short", "value", 1000);
    cache.set("long", "value", 120_000);

    vi.advanceTimersByTime(1001);

    expect(cache.get("short")).toBeNull();
    expect(cache.get("long")).toBe("value");
  });

  it("evicts oldest entry when at capacity", () => {
    for (let i = 0; i < 5; i++) {
      cache.set(`key${i}`, `value${i}`);
      vi.advanceTimersByTime(1); // Ensure different createdAt
    }

    // Cache is full. Adding a 6th should evict key0
    cache.set("key5", "value5");

    expect(cache.get("key0")).toBeNull();
    expect(cache.get("key5")).toBe("value5");
  });

  it("has() returns false for expired entries", () => {
    cache.set("key1", "value1", 1000);

    expect(cache.has("key1")).toBe(true);

    vi.advanceTimersByTime(1001);

    expect(cache.has("key1")).toBe(false);
  });

  it("delete() removes specific keys", () => {
    cache.set("key1", "value1");
    expect(cache.delete("key1")).toBe(true);
    expect(cache.get("key1")).toBeNull();
  });

  it("clear() removes all entries", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.clear();

    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
  });

  it("tracks hit/miss statistics", () => {
    cache.set("key1", "value1");

    cache.get("key1"); // hit
    cache.get("key1"); // hit
    cache.get("key2"); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3);
    expect(stats.size).toBe(1);
  });

  it("buildKey generates consistent keys for same input", () => {
    const key1 = CacheManager.buildKey("audience", { quiz: "data" });
    const key2 = CacheManager.buildKey("audience", { quiz: "data" });
    expect(key1).toBe(key2);
  });

  it("buildKey generates different keys for different inputs", () => {
    const key1 = CacheManager.buildKey("audience", { quiz: "data1" });
    const key2 = CacheManager.buildKey("audience", { quiz: "data2" });
    expect(key1).not.toBe(key2);
  });

  it("buildKey generates different keys for different agent types", () => {
    const key1 = CacheManager.buildKey("audience", { quiz: "data" });
    const key2 = CacheManager.buildKey("campaign", { quiz: "data" });
    expect(key1).not.toBe(key2);
  });

  it("getOrCompute returns cached value without recomputing", async () => {
    const compute = vi.fn().mockResolvedValue("computed");

    const result1 = await cache.getOrCompute("key1", compute);
    const result2 = await cache.getOrCompute("key1", compute);

    expect(result1).toBe("computed");
    expect(result2).toBe("computed");
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("getOrCompute recomputes after expiry", async () => {
    const compute = vi.fn().mockResolvedValue("computed");

    await cache.getOrCompute("key1", compute, 1000);

    vi.advanceTimersByTime(1001);

    await cache.getOrCompute("key1", compute, 1000);

    expect(compute).toHaveBeenCalledTimes(2);
  });
});
