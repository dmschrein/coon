import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { generateSponsorPitch } from "@/lib/agents/sponsor-pitch";
import { buildPitchAudienceMetrics } from "@/lib/agents/sponsor-pitch-input";
import { createOrchestration } from "@/lib/orchestration";
import { logAgentRun } from "@/lib/agents/utils";
import type { AudienceProfile } from "@/types";

export const maxDuration = 120;

const { queue, circuitBreaker } = createOrchestration();

const MODEL_FOR_LOGGING = "claude-sonnet-4-20250514";

export async function POST(
  _req: Request,
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
    const { sponsorRepo, profileRepo, quizRepo } = getContainer();

    const sponsor = await sponsorRepo.getSponsor(id);
    if (!sponsor || sponsor.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Sponsor not found", code: "NOT_FOUND" },
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

    const audienceMetrics = await buildPitchAudienceMetrics(userId);
    if (audienceMetrics.memberCount === 0) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message:
              "Connect a social account so we can ground the pitch in real audience numbers.",
            code: "NO_AUDIENCE_DATA",
          },
        },
        { status: 422 }
      );
    }

    const product = {
      name: quiz.responseData.elevatorPitch,
      description: quiz.responseData.problemSolved,
    };
    const communityName = quiz.responseData.elevatorPitch.slice(0, 80);

    try {
      const { result, modelUsed, tokensUsed } = await queue.enqueue({
        id: `sponsor-pitch:${id}`,
        agentType: "sponsor_pitch",
        priority: 1,
        execute: () =>
          circuitBreaker.execute(() =>
            generateSponsorPitch({
              sponsor: {
                companyName: sponsor.companyName,
                contactName: sponsor.contactName,
                deliverables: sponsor.deliverables,
              },
              product,
              audienceProfile: profileEntity.profileData as AudienceProfile,
              audienceMetrics,
              communityName,
            })
          ),
      });

      await logAgentRun({
        userId,
        agentType: "sponsor_pitch",
        inputData: {
          sponsorId: id,
          companyName: sponsor.companyName,
          memberCount: audienceMetrics.memberCount,
        },
        outputData: {
          subjectLength: result.subject.length,
          bodyLength: result.body.length,
        },
        modelUsed,
        tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return NextResponse.json({
        data: {
          subject: result.subject,
          body: result.body,
          followUp: result.followUp,
          modelUsed,
          tokensUsed,
        },
        error: null,
      });
    } catch (agentError) {
      const message =
        agentError instanceof Error ? agentError.message : "Agent failed";

      await logAgentRun({
        userId,
        agentType: "sponsor_pitch",
        inputData: {
          sponsorId: id,
          companyName: sponsor.companyName,
          memberCount: audienceMetrics.memberCount,
        },
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
    console.error("Error drafting sponsor pitch:", error);
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
