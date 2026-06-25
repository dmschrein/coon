import { CLAUDE_MODEL } from "@/lib/model";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import {
  writeTierCopy,
  type TierCopyInput,
} from "@/lib/agents/offer-copywriter";
import { tierCopyInputSchema } from "@/lib/validations/tier";
import { logAgentRun } from "@/lib/agents/utils";

export const maxDuration = 120;

const MODEL_FOR_LOGGING = CLAUDE_MODEL;

export async function POST(req: Request) {
  const startTime = Date.now();

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

    const body = await req.json();
    const input = tierCopyInputSchema.parse(body) as TierCopyInput;

    try {
      const { result, modelUsed, tokensUsed } = await writeTierCopy(input);
      const durationMs = Date.now() - startTime;

      await logAgentRun({
        userId,
        agentType: "tier_copy",
        inputData: { communityName: input.communityName },
        outputData: { name: result.name, benefitCount: result.benefits.length },
        modelUsed,
        tokensUsed,
        durationMs,
        status: "success",
      });

      return NextResponse.json({ data: result, error: null });
    } catch (agentError) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        agentError instanceof Error ? agentError.message : "Unknown error";

      await logAgentRun({
        userId,
        agentType: "tier_copy",
        inputData: { communityName: input.communityName },
        modelUsed: MODEL_FOR_LOGGING,
        durationMs,
        status: "failed",
        errorMessage,
      });

      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate tier copy. Please try again.",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: error.issues[0].message,
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    console.error("Error generating tier copy:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
