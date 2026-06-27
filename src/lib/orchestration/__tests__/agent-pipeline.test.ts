import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentPipeline } from "../agent-pipeline";
import { AgentQueue } from "../agent-queue";
import { CircuitBreaker } from "../circuit-breaker";
import { CacheManager } from "../cache-manager";
import type { CampaignPlatform } from "@/types";

function buildPipeline() {
  const queue = new AgentQueue({ maxConcurrent: 5, rateLimit: 1000 });
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: 100,
    resetTimeoutMs: 1000,
    halfOpenSuccessThreshold: 1,
  });
  const cache = new CacheManager({ defaultTtlMs: 60_000, maxEntries: 100 });
  const pipeline = new AgentPipeline({ queue, circuitBreaker, cache });
  return { queue, circuitBreaker, cache, pipeline };
}

describe("AgentPipeline.executeStep", () => {
  it("executes the agent fn on a cache miss and returns a result", async () => {
    const { pipeline } = buildPipeline();
    const agentFn = vi
      .fn()
      .mockResolvedValue({ data: { value: "out" }, tokensUsed: 123 });

    const result = await pipeline.executeStep("audience", { q: 1 }, agentFn);

    expect(agentFn).toHaveBeenCalledWith({ q: 1 });
    expect(result.data).toEqual({ value: "out" });
    expect(result.tokensUsed).toBe(123);
    expect(result.cached).toBe(false);
    expect(typeof result.durationMs).toBe("number");
  });

  it("does not cache when cacheTtlMs is not provided", async () => {
    const { pipeline } = buildPipeline();
    const agentFn = vi.fn().mockResolvedValue({ data: "x", tokensUsed: 1 });

    await pipeline.executeStep("a", { k: 1 }, agentFn);
    await pipeline.executeStep("a", { k: 1 }, agentFn);

    // No caching -> fn called both times
    expect(agentFn).toHaveBeenCalledTimes(2);
  });

  it("caches the result and returns cached=true on a hit when cacheTtlMs set", async () => {
    const { pipeline } = buildPipeline();
    const agentFn = vi.fn().mockResolvedValue({ data: "x", tokensUsed: 7 });

    const first = await pipeline.executeStep("a", { k: 1 }, agentFn, {
      cacheTtlMs: 60_000,
    });
    expect(first.cached).toBe(false);

    const second = await pipeline.executeStep("a", { k: 1 }, agentFn, {
      cacheTtlMs: 60_000,
    });
    expect(second.cached).toBe(true);
    expect(second.data).toBe("x");
    expect(agentFn).toHaveBeenCalledTimes(1);
  });

  it("respects a custom priority option", async () => {
    const { pipeline } = buildPipeline();
    const agentFn = vi.fn().mockResolvedValue({ data: "x", tokensUsed: 0 });
    const result = await pipeline.executeStep("a", { k: 1 }, agentFn, {
      priority: 1,
    });
    expect(result.data).toBe("x");
  });

  it("propagates agent fn errors", async () => {
    const { pipeline } = buildPipeline();
    const agentFn = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(pipeline.executeStep("a", { k: 1 }, agentFn)).rejects.toThrow(
      "boom"
    );
  });
});

describe("AgentPipeline.executeParallel", () => {
  it("runs steps in parallel and isolates a single failure", async () => {
    const { pipeline } = buildPipeline();

    const results = await pipeline.executeParallel<string>([
      {
        agentType: "t",
        id: "ok-1",
        execute: () => Promise.resolve("a"),
      },
      {
        agentType: "t",
        id: "bad",
        execute: () => Promise.reject(new Error("step failed")),
      },
      {
        agentType: "t",
        id: "ok-2",
        execute: () => Promise.resolve("c"),
        priority: 1,
      },
    ]);

    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(byId["ok-1"].result).toBe("a");
    expect(byId["ok-2"].result).toBe("c");
    expect(byId["bad"].result).toBeUndefined();
    expect(byId["bad"].error).toBe("step failed");
  });

  it("stringifies non-Error rejection reasons", async () => {
    const { pipeline } = buildPipeline();
    const results = await pipeline.executeParallel<string>([
      {
        agentType: "t",
        id: "x",
        execute: () => Promise.reject("plain string"),
      },
    ]);
    expect(results[0].error).toBe("plain string");
  });
});

describe("AgentPipeline.generatePlatformContent", () => {
  it("generates content for each platform via the generator map", async () => {
    const { pipeline } = buildPipeline();
    const platforms: CampaignPlatform[] = ["twitter", "blog"];

    const results = await pipeline.generatePlatformContent(platforms, {
      twitter: () => Promise.resolve({ content: "tweet", tokensUsed: 10 }),
      blog: () => Promise.resolve({ content: "article", tokensUsed: 50 }),
    });

    const byPlatform = Object.fromEntries(results.map((r) => [r.platform, r]));
    expect(byPlatform.twitter.content).toBe("tweet");
    expect(byPlatform.twitter.tokensUsed).toBe(10);
    expect(byPlatform.blog.content).toBe("article");
    expect(byPlatform.blog.tokensUsed).toBe(50);
    expect(byPlatform.twitter.error).toBeUndefined();
  });

  it("isolates a missing generator as a per-platform error", async () => {
    const { pipeline } = buildPipeline();
    const platforms: CampaignPlatform[] = ["twitter", "reddit"];

    const results = await pipeline.generatePlatformContent(platforms, {
      twitter: () => Promise.resolve({ content: "tweet", tokensUsed: 1 }),
      // reddit generator intentionally missing
    });

    const reddit = results.find((r) => r.platform === "reddit")!;
    expect(reddit.content).toBeNull();
    expect(reddit.tokensUsed).toBe(0);
    expect(reddit.error).toMatch(/No generator for platform: reddit/);

    const twitter = results.find((r) => r.platform === "twitter")!;
    expect(twitter.content).toBe("tweet");
  });
});

describe("AgentPipeline health and status", () => {
  it("reports healthy when the circuit breaker is closed", () => {
    const { pipeline } = buildPipeline();
    expect(pipeline.isHealthy()).toBe(true);
  });

  it("reports unhealthy when the circuit breaker is open", async () => {
    const queue = new AgentQueue({ maxConcurrent: 5, rateLimit: 1000 });
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 60_000,
      halfOpenSuccessThreshold: 1,
    });
    const cache = new CacheManager({ defaultTtlMs: 1000, maxEntries: 10 });
    const pipeline = new AgentPipeline({ queue, circuitBreaker, cache });

    await circuitBreaker
      .execute(() => Promise.reject(new Error("fail")))
      .catch(() => {});

    expect(circuitBreaker.getState()).toBe("open");
    expect(pipeline.isHealthy()).toBe(false);
  });

  it("getStatus aggregates queue, circuit breaker, cache, and health", async () => {
    const { pipeline } = buildPipeline();
    const agentFn = vi.fn().mockResolvedValue({ data: "x", tokensUsed: 1 });
    await pipeline.executeStep("a", { k: 1 }, agentFn);

    const status = pipeline.getStatus();
    expect(status).toHaveProperty("queue");
    expect(status).toHaveProperty("circuitBreaker");
    expect(status).toHaveProperty("cache");
    expect(status.healthy).toBe(true);
  });
});
