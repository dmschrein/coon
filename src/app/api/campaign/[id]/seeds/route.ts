import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import { createOrchestration } from "@/lib/orchestration";
import { generateConversationSeeds } from "@/lib/agents/conversation-seed";
import { logAgentRun } from "@/lib/agents/utils";
import { seedRequestSchema } from "@/lib/validations/conversation-seed";

export const maxDuration = 120;

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

    const { id: campaignId } = await params;
    const body = seedRequestSchema.parse(await req.json());

    const { campaignService, profileRepo } = getContainer();
    const { campaign } = await campaignService.getCampaign(campaignId, userId);

    if (!campaign.strategy || !campaign.audienceProfileId) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message:
              "Campaign must have a generated strategy and audience profile before seeds can be created",
            code: "INVALID_STATE",
          },
        },
        { status: 400 }
      );
    }

    const profile = await profileRepo.findById(campaign.audienceProfileId);
    if (!profile) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Audience profile not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const pillars = (
      campaign.contentPillars ??
      campaign.strategy.contentPillars ??
      []
    )
      .map((p) => p.theme)
      .filter((t): t is string => Boolean(t));

    const { pipeline } = createOrchestration();

    try {
      const stepResult = await pipeline.executeStep(
        "conversation_seeds",
        {
          audienceProfile: profile.profileData,
          contentPillars: pillars,
          platform: body.platform,
          count: body.count,
        },
        async (input) => {
          const r = await generateConversationSeeds(input);
          return { data: r, tokensUsed: r.tokensUsed };
        },
        { priority: 3 }
      );

      if (!stepResult.cached) {
        await logAgentRun({
          userId,
          agentType: "conversation_seeds",
          inputData: {
            campaignId,
            platform: body.platform,
            count: body.count,
          },
          outputData: { seedCount: stepResult.data.seeds.length },
          modelUsed: stepResult.data.modelUsed,
          tokensUsed: stepResult.tokensUsed,
          durationMs: Date.now() - startTime,
          status: "success",
        });
      }

      return NextResponse.json({
        data: { seeds: stepResult.data.seeds },
        error: null,
      });
    } catch (agentError) {
      const errorMessage =
        agentError instanceof Error ? agentError.message : "Unknown error";

      await logAgentRun({
        userId,
        agentType: "conversation_seeds",
        inputData: {
          campaignId,
          platform: body.platform,
          count: body.count,
        },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs: Date.now() - startTime,
        status: "failed",
        errorMessage,
      });

      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate seeds. Please try again.",
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

    if (error instanceof ServiceError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "UNAUTHORIZED"
            ? 401
            : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error generating conversation seeds:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
