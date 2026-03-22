import { describe, it, expect } from "vitest";
import { AgentQueue, type AgentTask } from "../agent-queue";

function createTask<T>(
  id: string,
  result: T,
  options?: { priority?: number; delayMs?: number; tokenBudget?: number }
): AgentTask<T> {
  return {
    id,
    agentType: "test",
    priority: options?.priority ?? 5,
    tokenBudget: options?.tokenBudget,
    execute: () =>
      new Promise((resolve) =>
        setTimeout(() => resolve(result), options?.delayMs ?? 0)
      ),
  };
}

function createFailingTask(id: string, error: string): AgentTask<never> {
  return {
    id,
    agentType: "test",
    priority: 5,
    execute: () => Promise.reject(new Error(error)),
  };
}

describe("AgentQueue", () => {
  it("executes a single task", async () => {
    const queue = new AgentQueue({ maxConcurrent: 3, rateLimit: 60 });
    const result = await queue.enqueue(createTask("t1", "hello"));
    expect(result).toBe("hello");
  });

  it("respects concurrency limit", async () => {
    const queue = new AgentQueue({ maxConcurrent: 2, rateLimit: 60 });
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`,
      agentType: "test",
      priority: 5,
      execute: async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 50));
        concurrent--;
        return i;
      },
    }));

    await Promise.all(tasks.map((t) => queue.enqueue(t)));

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("processes higher priority tasks first", async () => {
    const queue = new AgentQueue({ maxConcurrent: 1, rateLimit: 60 });
    const executionOrder: string[] = [];

    // Block the queue with a long-running task first
    const blocker = queue.enqueue({
      id: "blocker",
      agentType: "test",
      priority: 5,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 50));
        executionOrder.push("blocker");
        return "blocked";
      },
    });

    // Now add tasks with different priorities while blocker is running
    const low = queue.enqueue({
      id: "low",
      agentType: "test",
      priority: 10,
      execute: async () => {
        executionOrder.push("low");
        return "low";
      },
    });

    const high = queue.enqueue({
      id: "high",
      agentType: "test",
      priority: 1,
      execute: async () => {
        executionOrder.push("high");
        return "high";
      },
    });

    await Promise.all([blocker, high, low]);

    // After the blocker, high priority should execute before low
    expect(executionOrder).toEqual(["blocker", "high", "low"]);
  });

  it("handles task failures without blocking the queue", async () => {
    const queue = new AgentQueue({ maxConcurrent: 2, rateLimit: 60 });

    const fail = queue
      .enqueue(createFailingTask("fail", "oops"))
      .catch((e: Error) => e.message);
    const success = queue.enqueue(createTask("ok", "success"));

    const [failResult, successResult] = await Promise.all([fail, success]);

    expect(failResult).toBe("oops");
    expect(successResult).toBe("success");
  });

  it("executeBatch returns settled results in order", async () => {
    const queue = new AgentQueue({ maxConcurrent: 3, rateLimit: 60 });

    const tasks = [
      createTask("t1", "a"),
      createFailingTask("t2", "fail"),
      createTask("t3", "c"),
    ];

    const results = await queue.executeBatch(tasks);

    expect(results[0]).toEqual({ status: "fulfilled", value: "a" });
    expect(results[1]).toMatchObject({ status: "rejected" });
    expect(results[2]).toEqual({ status: "fulfilled", value: "c" });
  });

  it("tracks metrics correctly", async () => {
    const queue = new AgentQueue({ maxConcurrent: 3, rateLimit: 60 });

    await queue.enqueue(createTask("t1", "ok", { tokenBudget: 500 }));
    await queue.enqueue(createTask("t2", "ok", { tokenBudget: 300 }));
    await queue.enqueue(createFailingTask("t3", "fail")).catch(() => {});

    const metrics = queue.getMetrics();

    expect(metrics.totalExecuted).toBe(2);
    expect(metrics.totalFailed).toBe(1);
    expect(metrics.totalTokensUsed).toBe(800);
    expect(metrics.queueDepth).toBe(0);
  });

  it("clear rejects all pending tasks", async () => {
    const queue = new AgentQueue({ maxConcurrent: 1, rateLimit: 60 });

    // Block the queue
    const blocker = queue.enqueue({
      id: "blocker",
      agentType: "test",
      priority: 5,
      execute: () => new Promise((r) => setTimeout(r, 200)),
    });

    // Queue some tasks that will be pending
    const pending1 = queue
      .enqueue(createTask("p1", "a"))
      .catch((e: Error) => e.message);
    const pending2 = queue
      .enqueue(createTask("p2", "b"))
      .catch((e: Error) => e.message);

    // Clear the queue
    queue.clear();

    const [p1, p2] = await Promise.all([pending1, pending2]);
    await blocker;

    expect(p1).toBe("Queue cleared");
    expect(p2).toBe("Queue cleared");
  });
});
