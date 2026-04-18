/**
 * Campaign Content Scoring API - Score all content in a campaign.
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";

export const maxDuration = 120;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const { enrichmentService } = getContainer();
    const result = await enrichmentService.scoreCampaignContent(
      campaignId,
      user.id
    );

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to score content";
    return NextResponse.json(
      { data: null, error: { message, code: "SCORING_ERROR" } },
      { status: 500 }
    );
  }
}
