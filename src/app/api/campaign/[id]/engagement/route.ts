/**
 * Campaign Engagement API - Retrieve engagement records for campaign content.
 *
 * GET /api/campaign/[id]/engagement
 * Returns all engagement records for all content in the campaign.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { campaignRepo, contentRepo, engagementRepo } = getContainer();

    const campaign = await campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Campaign not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const allContent = await contentRepo.findByCampaignId(campaignId);

    const engagementByContent = await Promise.all(
      allContent.map((c) => engagementRepo.getEngagementByContentId(c.id))
    );

    const data = engagementByContent.flat().map((row) => ({
      contentId: row.campaignContentId,
      platform: row.platform,
      likes: row.likes,
      comments: row.comments,
      shares: row.shares,
      reach: row.reach,
      impressions: row.impressions,
      engagementRate: row.engagementRate,
      recordedAt: row.recordedAt,
    }));

    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status: 404 }
      );
    }

    console.error("Error fetching campaign engagement:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch engagement data",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
