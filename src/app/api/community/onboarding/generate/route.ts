import { CLAUDE_MODEL } from "@/lib/model";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { generateOnboardingSequence } from "@/lib/agents/onboarding-writer";
import { logAgentRun } from "@/lib/agents/utils";
import { onboardingGenerateRequestSchema } from "@/lib/validations/onboarding";
import type { OnboardingInput } from "@/types";

export const maxDuration = 120;

const MODEL = CLAUDE_MODEL;

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
    { status: 401 }
  );
}

function badRequest(message: string, code: string) {
  return NextResponse.json(
    { data: null, error: { message, code } },
    { status: 400 }
  );
}

/** POST — generate a 5-step onboarding sequence and persist the steps. */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const { communityName, productPitch } =
      onboardingGenerateRequestSchema.parse(body);

    const { onboardingRepo, profileRepo } = getContainer();

    const profile = await profileRepo.findActiveByUserId(userId);
    if (!profile) {
      return badRequest(
        "Generate an audience profile before building an onboarding sequence.",
        "NO_PROFILE"
      );
    }

    const sequence =
      (await onboardingRepo.getSequence(userId)) ??
      (await onboardingRepo.createSequence({ userId }));

    const input: OnboardingInput = {
      audienceProfile: profile.profileData,
      communityName,
      productPitch,
    };

    const startTime = Date.now();
    try {
      const { steps, tokensUsed } = await generateOnboardingSequence(input);

      for (const step of steps) {
        await onboardingRepo.upsertStep(sequence.id, step);
      }

      await logAgentRun({
        userId,
        agentType: "onboarding_sequence",
        inputData: { communityName, productPitch },
        outputData: { stepCount: steps.length },
        modelUsed: MODEL,
        tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return NextResponse.json({
        data: { sequence: { ...sequence, steps } },
        error: null,
      });
    } catch (agentError) {
      await logAgentRun({
        userId,
        agentType: "onboarding_sequence",
        inputData: { communityName, productPitch },
        modelUsed: MODEL,
        durationMs: Date.now() - startTime,
        status: "failed",
        errorMessage:
          agentError instanceof Error ? agentError.message : String(agentError),
      });
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate onboarding sequence",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0].message, "VALIDATION_ERROR");
    }

    console.error("Error generating onboarding sequence:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to generate onboarding sequence",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
