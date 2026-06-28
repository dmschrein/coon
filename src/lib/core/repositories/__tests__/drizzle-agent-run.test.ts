import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleAgentRunRepository } from "../drizzle-agent-run";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function runRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    agentType: "content",
    status: "success",
    durationMs: 100,
    tokensUsed: 50,
    ...overrides,
  };
}

describe("DrizzleAgentRunRepository", () => {
  describe("log", () => {
    it("inserts a run record with the supplied fields", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([]);
      const repo = new DrizzleAgentRunRepository(db);

      await repo.log({
        userId: "user_123",
        agentType: "content" as never,
        inputData: { a: 1 },
        outputData: { b: 2 },
        modelUsed: "claude",
        tokensUsed: 10,
        durationMs: 200,
        status: "success" as never,
      });

      expect(captured.insertValues).toMatchObject({
        userId: "user_123",
        agentType: "content",
        modelUsed: "claude",
        status: "success",
      });
    });
  });

  describe("getMetrics", () => {
    it("returns zeroed metrics for no rows (no filters branch)", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleAgentRunRepository(db);

      const metrics = await repo.getMetrics();

      expect(metrics.totalRuns).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.avgDurationMs).toBe(0);
      expect(metrics.byAgentType).toEqual({});
    });

    it("aggregates success/failure counts, tokens and avg durations per type", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        runRow({
          agentType: "content",
          status: "success",
          durationMs: 100,
          tokensUsed: 50,
        }),
        runRow({
          agentType: "content",
          status: "failed",
          durationMs: 300,
          tokensUsed: 50,
        }),
        runRow({
          agentType: "audience",
          status: "success",
          durationMs: 0,
          tokensUsed: 0,
        }),
      ]);
      const repo = new DrizzleAgentRunRepository(db);

      const metrics = await repo.getMetrics();

      expect(metrics.totalRuns).toBe(3);
      expect(metrics.successCount).toBe(2);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.successRate).toBeCloseTo(2 / 3);
      // durationCount counts only truthy durations (100, 300) => avg 200
      expect(metrics.avgDurationMs).toBe(200);
      expect(metrics.totalTokensUsed).toBe(100);
      expect(metrics.byAgentType.content.runs).toBe(2);
      expect(metrics.byAgentType.content.successes).toBe(1);
      expect(metrics.byAgentType.content.failures).toBe(1);
      expect(metrics.byAgentType.content.avgDurationMs).toBe(200);
      expect(metrics.byAgentType.audience.runs).toBe(1);
    });

    it("applies the agentType + since filters (whereClause branch)", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([runRow()]);
      const repo = new DrizzleAgentRunRepository(db);

      const metrics = await repo.getMetrics({
        agentType: "content" as never,
        since: new Date("2026-01-01"),
      });

      expect(metrics.totalRuns).toBe(1);
    });

    it("handles rows with null tokens/duration", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        runRow({ tokensUsed: null, durationMs: null, status: "failed" }),
      ]);
      const repo = new DrizzleAgentRunRepository(db);

      const metrics = await repo.getMetrics();

      expect(metrics.totalTokensUsed).toBe(0);
      expect(metrics.avgDurationMs).toBe(0);
      expect(metrics.byAgentType.content.totalTokensUsed).toBe(0);
    });
  });
});
