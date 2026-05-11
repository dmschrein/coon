import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { draftColdOutreach } from "@/lib/agents/cold-outreach";
import { createOrchestration } from "@/lib/orchestration";
import { logAgentRun } from "@/lib/agents/utils";
import { draftColdOutreachBodySchema } from "@/lib/validations/prospect";
import type { AudienceProfile } from "@/types";

export const maxDuration = 120;

const { queue, circuitBreaker } = createOrchestration();

const MODEL_FOR_LOGGING = "claude-sonnet-4-20250514";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    let body: { communityName?: string } = {};
    try {
      const raw = await req.json().catch(() => ({}));
      body = draftColdOutreachBodySchema.parse(raw ?? {});
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            data: null,
            error: {
              message: err.issues[0].message,
              code: "VALIDATION_ERROR",
            },
          },
          { status: 400 }
        );
      }
      throw err;
    }

    const { prospectRepo, profileRepo, quizRepo } = getContainer();

    const prospect = await prospectRepo.getProspect(id);
    if (!prospect || prospect.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Prospect not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const profileEntity = await profileRepo.findActiveByUserId(userId);
    if (!profileEntity) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "No active audience profile found",
            code: "NO_PROFILE",
          },
        },
        { status: 422 }
      );
    }

    const quiz = await quizRepo.findLatestByUserId(userId);
    if (!quiz) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "No quiz response found",
            code: "NO_QUIZ_RESPONSE",
          },
        },
        { status: 422 }
      );
    }

    const product = {
      name: quiz.responseData.elevatorPitch,
      description: quiz.responseData.problemSolved,
      targetAudience: quiz.responseData.idealCustomer,
    };
    const communityName =
      body.communityName ?? quiz.responseData.elevatorPitch.slice(0, 80);

    try {
      const { result, modelUsed, tokensUsed } = await queue.enqueue({
        id: `cold-outreach:${id}`,
        agentType: "cold_outreach",
        priority: 1,
        execute: () =>
          circuitBreaker.execute(() =>
            draftColdOutreach({
              prospect: {
                handle: prospect.handle,
                platform: prospect.platform,
                source: prospect.source ?? "manual",
              },
              product,
              audienceProfile: profileEntity.profileData as AudienceProfile,
              communityName,
            })
          ),
      });

      await logAgentRun({
        userId,
        agentType: "cold_outreach",
        inputData: { prospectId: id, platform: prospect.platform },
        outputData: { variantCount: result.variants.length },
        modelUsed,
        tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return NextResponse.json({
        data: { variants: result.variants, modelUsed, tokensUsed },
        error: null,
      });
    } catch (agentError) {
      const message =
        agentError instanceof Error ? agentError.message : "Agent failed";

      await logAgentRun({
        userId,
        agentType: "cold_outreach",
        inputData: { prospectId: id, platform: prospect.platform },
        modelUsed: MODEL_FOR_LOGGING,
        durationMs: Date.now() - startTime,
        status: "failed",
        errorMessage: message,
      });

      return NextResponse.json(
        {
          data: null,
          error: { message, code: "AGENT_FAILED" },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error drafting cold outreach:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
