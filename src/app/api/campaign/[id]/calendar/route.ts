import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  campaigns,
  campaignCalendarEntries,
  audienceProfiles,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateCampaignCalendar } from "@/lib/agents/campaign-calendar";
import { logAgentRun } from "@/lib/agents/utils";
import type { AudienceProfile, CampaignStrategy } from "@/types";

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

    if (campaign.status !== "strategy_complete") {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Campaign strategy must be generated first",
            code: "INVALID_STATE",
          },
        },
        { status: 400 }
      );
    }

    // Fetch audience profile
    const [profile] = await db
      .select()
      .from(audienceProfiles)
      .where(eq(audienceProfiles.id, campaign.audienceProfileId!))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Audience profile not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const startTime = Date.now();

    try {
      const strategy = campaign.strategyData as CampaignStrategy;
      const profileData = profile.profileData as AudienceProfile;

      // Generate calendar
      const calendarResult = await generateCampaignCalendar(
        strategy,
        profileData
      );

      const durationMs = Date.now() - startTime;

      // Update campaign with calendar data
      await db
        .update(campaigns)
        .set({
          calendarData: calendarResult.calendar,
          status: "calendar_complete",
          totalTokensUsed: campaign.totalTokensUsed + calendarResult.tokensUsed,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId));

      // Insert calendar entries into the database
      await db.insert(campaignCalendarEntries).values(
        calendarResult.calendar.entries.map((entry) => ({
          campaignId,
          userId,
          dayNumber: entry.dayNumber,
          platform: entry.platform,
          contentType: entry.contentType,
          title: entry.title,
          postingTime: entry.postingTime,
          pillar: entry.pillar,
          notes: entry.notes,
        }))
      );

      // Log the agent run
      await logAgentRun({
        userId,
        agentType: "campaign_calendar",
        inputData: { campaignId },
        outputData: { totalPosts: calendarResult.calendar.totalPosts },
        modelUsed: calendarResult.modelUsed,
        tokensUsed: calendarResult.tokensUsed,
        durationMs,
        status: "success",
      });

      return NextResponse.json({
        data: calendarResult.calendar,
        error: null,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await logAgentRun({
        userId,
        agentType: "campaign_calendar",
        inputData: { campaignId },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate campaign calendar. Please try again.",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating calendar:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
