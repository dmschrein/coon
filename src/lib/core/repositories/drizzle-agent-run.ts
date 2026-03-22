/**
 * Drizzle Agent Run Repository - Data access for agent execution logs and metrics.
 */

import { eq, and, gte } from "drizzle-orm";
import { agentRuns } from "@/lib/db/schema";
import type { AgentRunRepository, AgentRunMetrics } from "./interfaces";
import type { AgentType, AgentStatus } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleAgentRunRepository implements AgentRunRepository {
  constructor(private db: DrizzleDb) {}

  async log(params: {
    userId: string;
    agentType: AgentType;
    inputData?: unknown;
    outputData?: unknown;
    modelUsed?: string;
    tokensUsed?: number;
    durationMs?: number;
    status: AgentStatus | "failed";
    errorMessage?: string;
  }): Promise<void> {
    await this.db.insert(agentRuns).values({
      userId: params.userId,
      agentType: params.agentType,
      inputData: params.inputData,
      outputData: params.outputData,
      modelUsed: params.modelUsed,
      tokensUsed: params.tokensUsed,
      durationMs: params.durationMs,
      status: params.status,
      errorMessage: params.errorMessage,
    });
  }

  async getMetrics(params?: {
    agentType?: AgentType;
    since?: Date;
  }): Promise<AgentRunMetrics> {
    const conditions = [];
    if (params?.agentType) {
      conditions.push(eq(agentRuns.agentType, params.agentType));
    }
    if (params?.since) {
      conditions.push(gte(agentRuns.createdAt, params.since));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = whereClause
      ? await this.db.select().from(agentRuns).where(whereClause)
      : await this.db.select().from(agentRuns);

    // Aggregate in application code for simplicity
    const byAgentType: AgentRunMetrics["byAgentType"] = {};
    let totalRuns = 0;
    let successCount = 0;
    let failureCount = 0;
    let totalDuration = 0;
    let durationCount = 0;
    let totalTokensUsed = 0;

    for (const row of rows) {
      totalRuns++;
      const isSuccess = row.status === "success";
      if (isSuccess) successCount++;
      else failureCount++;

      if (row.durationMs) {
        totalDuration += row.durationMs;
        durationCount++;
      }
      if (row.tokensUsed) totalTokensUsed += row.tokensUsed;

      // Per-agent-type breakdown
      const type = row.agentType;
      if (!byAgentType[type]) {
        byAgentType[type] = {
          runs: 0,
          successes: 0,
          failures: 0,
          avgDurationMs: 0,
          totalTokensUsed: 0,
        };
      }
      const entry = byAgentType[type];
      entry.runs++;
      if (isSuccess) entry.successes++;
      else entry.failures++;
      entry.totalTokensUsed += row.tokensUsed ?? 0;
    }

    // Calculate averages for per-type breakdown
    for (const row of rows) {
      const type = row.agentType;
      if (row.durationMs && byAgentType[type]) {
        byAgentType[type].avgDurationMs += row.durationMs;
      }
    }
    for (const entry of Object.values(byAgentType)) {
      if (entry.runs > 0) {
        entry.avgDurationMs = Math.round(entry.avgDurationMs / entry.runs);
      }
    }

    return {
      totalRuns,
      successCount,
      failureCount,
      successRate: totalRuns > 0 ? successCount / totalRuns : 0,
      avgDurationMs:
        durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      totalTokensUsed,
      byAgentType,
    };
  }
}
