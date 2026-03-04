import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  campaigns,
  campaignContent,
  audienceProfiles,
  quizResponses,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateCampaignStrategy } from "@/lib/agents/campaign-strategy";
import { logAgentRun } from "@/lib/agents/utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignPlatform,
} from "@/types";
import { z } from "zod";

export const maxDuration = 120;

const createCampaignSchema = z.object({
  selectedPlatforms: z.array(z.string()).min(1),
});

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const userCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));

    return NextResponse.json({ data: userCampaigns, error: null });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch campaigns", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { selectedPlatforms } = createCampaignSchema.parse(body);

    // Fetch active audience profile
    const [profile] = await db
      .select()
      .from(audienceProfiles)
      .where(
        and(
          eq(audienceProfiles.userId, userId),
          eq(audienceProfiles.isActive, true)
        )
      )
      .orderBy(desc(audienceProfiles.generatedAt))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message:
              "No audience profile found. Generate an audience profile first.",
            code: "NO_PROFILE",
          },
        },
        { status: 400 }
      );
    }

    // Fetch quiz response
    const [quizResponse] = await db
      .select()
      .from(quizResponses)
      .where(eq(quizResponses.userId, userId))
      .orderBy(desc(quizResponses.completedAt))
      .limit(1);

    if (!quizResponse) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "No quiz response found.",
            code: "NO_QUIZ_RESPONSE",
          },
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    try {
      const profileData = profile.profileData as AudienceProfile;
      const quizData = quizResponse.responseData as QuizResponse;

      // Step 1: Generate campaign strategy
      const strategyResult = await generateCampaignStrategy(
        profileData,
        quizData,
        selectedPlatforms as CampaignPlatform[]
      );

      const durationMs = Date.now() - startTime;

      // Step 2: Create campaign record
      const [campaign] = await db
        .insert(campaigns)
        .values({
          userId,
          audienceProfileId: profile.id,
          quizResponseId: quizResponse.id,
          name: strategyResult.strategy.campaignName,
          status: "strategy_complete",
          strategyData: strategyResult.strategy,
          selectedPlatforms,
          totalTokensUsed: strategyResult.tokensUsed,
        })
        .returning();

      // Step 3: Create placeholder campaign_content rows for each platform
      await db.insert(campaignContent).values(
        selectedPlatforms.map((platform) => ({
          campaignId: campaign.id,
          userId,
          platform,
          status: "pending" as const,
        }))
      );

      // Log the agent run
      await logAgentRun({
        userId,
        agentType: "campaign_strategy",
        inputData: {
          profileId: profile.id,
          quizResponseId: quizResponse.id,
          selectedPlatforms,
        },
        outputData: { campaignName: strategyResult.strategy.campaignName },
        modelUsed: strategyResult.modelUsed,
        tokensUsed: strategyResult.tokensUsed,
        durationMs,
        status: "success",
      });

      return NextResponse.json({ data: campaign, error: null });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await logAgentRun({
        userId,
        agentType: "campaign_strategy",
        inputData: { profileId: profile.id, selectedPlatforms },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate campaign strategy. Please try again.",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
