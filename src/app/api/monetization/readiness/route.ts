import { CLAUDE_MODEL } from "@/lib/model";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { assessMonetizationReadiness } from "@/lib/agents/monetization-readiness";
import { buildReadinessInput } from "@/lib/agents/monetization-readiness-input";
import { logAgentRun } from "@/lib/agents/utils";
import type { ReadinessInput, ReadinessOutput } from "@/types";

export const maxDuration = 120;

const CACHE_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }

    const {
      monetizationReadinessRepo,
      monetizationConfigRepo,
      monetizationPipeline,
    } = getContainer();

    const { cache, updatedAt } =
      await monetizationReadinessRepo.getCache(userId);
    if (
      cache &&
      updatedAt &&
      Date.now() - updatedAt.getTime() < CACHE_FRESH_MS
    ) {
      return NextResponse.json({ data: cache, error: null });
    }

    const config = await monetizationConfigRepo.getConfig(userId);
    if (!config) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Set up your monetization model before scoring readiness.",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const input = await buildReadinessInput(userId, config);
    const startTime = Date.now();

    try {
      const step = await monetizationPipeline.executeStep<
        ReadinessInput,
        ReadinessOutput
      >("monetization_readiness", input, async (i) => {
        const r = await assessMonetizationReadiness(i);
        return { data: r.result, tokensUsed: r.tokensUsed };
      });

      await monetizationReadinessRepo.upsertCache(userId, step.data);
      await logAgentRun({
        userId,
        agentType: "monetization_readiness",
        inputData: input,
        outputData: step.data,
        modelUsed: CLAUDE_MODEL,
        tokensUsed: step.tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return NextResponse.json({ data: step.data, error: null });
    } catch (agentError) {
      await logAgentRun({
        userId,
        agentType: "monetization_readiness",
        inputData: input,
        modelUsed: CLAUDE_MODEL,
        durationMs: Date.now() - startTime,
        status: "failed",
        errorMessage:
          agentError instanceof Error ? agentError.message : String(agentError),
      });
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to assess monetization readiness",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching monetization readiness:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch monetization readiness",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
