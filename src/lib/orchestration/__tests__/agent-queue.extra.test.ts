import { describe, it, expect, vi } from "vitest";
import { AgentQueue, type AgentTask } from "../agent-queue";

function task<T>(id: string, result: T, tokenBudget?: number): AgentTask<T> {
  return {
    id,
    agentType: "test",
    priority: 5,
    tokenBudget,
    execute: () => Promise.resolve(result),
  };
}

describe("AgentQueue rate limiting and token budget", () => {
  it("defers tasks beyond the rate limit then drains them after the window", async () => {
    vi.useFakeTimers();
    try {
      const queue = new AgentQueue({ maxConcurrent: 10, rateLimit: 2 });

      const p1 = queue.enqueue(task("t1", "a"));
      const p2 = queue.enqueue(task("t2", "b"));
      // Third exceeds the rate limit of 2 within the 60s window.
      const p3 = queue.enqueue(task("t3", "c"));

      // Flush microtasks so the first two synchronous tasks resolve.
      await vi.advanceTimersByTimeAsync(1);
      await expect(p1).resolves.toBe("a");
      await expect(p2).resolves.toBe("b");

      // Third is still parked behind the rate limiter.
      expect(queue.getQueueDepth()).toBe(1);

      // Move past the 60s window; the scheduled retry releases the third task.
      await vi.advanceTimersByTimeAsync(60_010);
      await expect(p3).resolves.toBe("c");
    } finally {
      vi.useRealTimers();
    }
  });

  it("defers a task when the per-minute token budget is exhausted", async () => {
    vi.useFakeTimers();
    try {
      const queue = new AgentQueue({
        maxConcurrent: 10,
        rateLimit: 100,
        tokenBudgetPerMinute: 100,
      });

      // First task consumes the entire budget.
      const p1 = queue.enqueue(task("t1", "a", 100));
      await vi.advanceTimersByTimeAsync(1);
      await expect(p1).resolves.toBe("a");

      // Next task is blocked by the token budget.
      const p2 = queue.enqueue(task("t2", "b", 50));
      await vi.advanceTimersByTimeAsync(1);
      expect(queue.getQueueDepth()).toBe(1);

      // After the window clears, the budget frees up and it runs.
      await vi.advanceTimersByTimeAsync(60_010);
      await expect(p2).resolves.toBe("b");

      expect(queue.getMetrics().totalTokensUsed).toBe(150);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("AgentQueue executeBatch concurrency override", () => {
  it("temporarily lowers maxConcurrent and restores it", async () => {
    const queue = new AgentQueue({ maxConcurrent: 5, rateLimit: 1000 });
    let active = 0;
    let maxActive = 0;

    const tasks: AgentTask<number>[] = Array.from({ length: 6 }, (_, i) => ({
      id: `t${i}`,
      agentType: "test",
      priority: 5,
      execute: async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 10));
        active--;
        return i;
      },
    }));

    const results = await queue.executeBatch(tasks, 2);
    expect(results).toHaveLength(6);
    expect(maxActive).toBeLessThanOrEqual(2);
    // Original maxConcurrent restored
    expect(queue.getActiveCount()).toBe(0);
  });
});

describe("AgentQueue.getActiveCount", () => {
  it("reflects in-flight tasks", async () => {
    const queue = new AgentQueue({ maxConcurrent: 2, rateLimit: 1000 });
    let release: () => void = () => {};
    const blocker = queue.enqueue({
      id: "b",
      agentType: "test",
      priority: 5,
      execute: () => new Promise<void>((r) => (release = r)),
    });

    // Allow microtasks so the task starts executing
    await Promise.resolve();
    expect(queue.getActiveCount()).toBe(1);

    release();
    await blocker;
    expect(queue.getActiveCount()).toBe(0);
  });
});
