import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  campaigns,
  campaignContent,
  audienceProfiles,
  quizResponses,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  generatePlatformBatch,
  getNextBatch,
} from "@/lib/agents/campaign-content";
import { logAgentRun } from "@/lib/agents/utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  CampaignPlatform,
} from "@/types";

export const maxDuration = 120;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    // Fetch campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Campaign not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    if (
      campaign.status !== "calendar_complete" &&
      campaign.status !== "generating_content"
    ) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Campaign calendar must be generated first",
            code: "INVALID_STATE",
          },
        },
        { status: 400 }
      );
    }

    // Fetch all campaign content to determine what's pending
    const allContent = await db
      .select()
      .from(campaignContent)
      .where(eq(campaignContent.campaignId, campaignId));

    const pendingContent = allContent.filter(
      (c) => c.status === "pending" || c.status === "failed"
    );

    if (pendingContent.length === 0) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "All platform content already generated",
            code: "NOTHING_TO_GENERATE",
          },
        },
        { status: 400 }
      );
    }

    // Determine next batch based on priority from strategy
    const strategy = campaign.strategyData as CampaignStrategy;
    const platformsByPriority = strategy.platformAllocations
      .sort((a, b) => a.priorityOrder - b.priorityOrder)
      .map((p) => p.platform);

    const pendingPlatforms = pendingContent
      .map((c) => c.platform)
      .sort(
        (a, b) =>
          platformsByPriority.indexOf(a as CampaignPlatform) -
          platformsByPriority.indexOf(b as CampaignPlatform)
      ) as CampaignPlatform[];

    const batch = getNextBatch(pendingPlatforms);

    if (batch.length === 0) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "No platforms to generate", code: "EMPTY_BATCH" },
        },
        { status: 400 }
      );
    }

    // Mark batch as generating
    await db
      .update(campaignContent)
      .set({ status: "generating", updatedAt: new Date() })
      .where(
        and(
          eq(campaignContent.campaignId, campaignId),
          eq(campaignContent.platform, batch[0])
        )
      );

    for (const platform of batch.slice(1)) {
      await db
        .update(campaignContent)
        .set({ status: "generating", updatedAt: new Date() })
        .where(
          and(
            eq(campaignContent.campaignId, campaignId),
            eq(campaignContent.platform, platform)
          )
        );
    }

    // Update campaign status to generating_content
    if (campaign.status !== "generating_content") {
      await db
        .update(campaigns)
        .set({ status: "generating_content", updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));
    }

    // Fetch audience profile and quiz response
    const [profile] = await db
      .select()
      .from(audienceProfiles)
      .where(eq(audienceProfiles.id, campaign.audienceProfileId!))
      .limit(1);

    const [quizResponse] = await db
      .select()
      .from(quizResponses)
      .where(eq(quizResponses.id, campaign.quizResponseId!))
      .limit(1);

    if (!profile || !quizResponse) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Profile or quiz not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const startTime = Date.now();

    try {
      const profileData = profile.profileData as AudienceProfile;
      const quizData = quizResponse.responseData as QuizResponse;

      // Generate content batch
      const batchResult = await generatePlatformBatch(
        batch,
        strategy,
        profileData,
        quizData
      );

      const durationMs = Date.now() - startTime;

      let totalTokensUsed = 0;

      // Update successful content
      for (const result of batchResult.results) {
        const contentRow = allContent.find((c) => c.platform === result.platform);
        if (contentRow) {
          await db
            .update(campaignContent)
            .set({
              contentData: result.content,
              status: "complete",
              tokensUsed: result.tokensUsed,
              updatedAt: new Date(),
            })
            .where(eq(campaignContent.id, contentRow.id));

          totalTokensUsed += result.tokensUsed;

          // Log individual platform generation
          await logAgentRun({
            userId,
            agentType: "campaign_content",
            inputData: { campaignId, platform: result.platform },
            outputData: { platform: result.platform },
            modelUsed: "claude-sonnet-4-20250514",
            tokensUsed: result.tokensUsed,
            durationMs: Math.floor(durationMs / batch.length),
            status: "success",
          });
        }
      }

      // Update failed content
      for (const error of batchResult.errors) {
        const contentRow = allContent.find((c) => c.platform === error.platform);
        if (contentRow) {
          await db
            .update(campaignContent)
            .set({
              status: "failed",
              errorMessage: error.error,
              updatedAt: new Date(),
            })
            .where(eq(campaignContent.id, contentRow.id));

          // Log failure
          await logAgentRun({
            userId,
            agentType: "campaign_content",
            inputData: { campaignId, platform: error.platform },
            modelUsed: "claude-sonnet-4-20250514",
            durationMs: Math.floor(durationMs / batch.length),
            status: "failed",
            errorMessage: error.error,
          });
        }
      }

      // Update campaign completed platforms and tokens
      const completedPlatforms = [
        ...(campaign.completedPlatforms || []),
        ...batchResult.results.map((r) => r.platform),
      ];

      await db
        .update(campaigns)
        .set({
          completedPlatforms,
          totalTokensUsed: campaign.totalTokensUsed + totalTokensUsed,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));

      // Check if all platforms are done
      const updatedContent = await db
        .select()
        .from(campaignContent)
        .where(eq(campaignContent.campaignId, campaignId));

      const allComplete = updatedContent.every((c) => c.status === "complete");

      if (allComplete) {
        await db
          .update(campaigns)
          .set({ status: "complete", updatedAt: new Date() })
          .where(eq(campaigns.id, campaignId));
      }

      const remainingPending = updatedContent.filter(
        (c) => c.status === "pending" || c.status === "failed"
      );

      return NextResponse.json({
        data: {
          completed: batchResult.results.map((r) => r.platform),
          failed: batchResult.errors.map((e) => e.platform),
          remaining: remainingPending.map((c) => c.platform),
          isComplete: allComplete,
        },
        error: null,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Mark batch as failed
      for (const platform of batch) {
        const contentRow = allContent.find((c) => c.platform === platform);
        if (contentRow) {
          await db
            .update(campaignContent)
            .set({
              status: "failed",
              errorMessage,
              updatedAt: new Date(),
            })
            .where(eq(campaignContent.id, contentRow.id));
        }
      }

      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate content batch. Please try again.",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
