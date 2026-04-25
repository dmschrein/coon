/**
 * Campaign Engagement Fetch API - Trigger immediate engagement ingestion.
 *
 * POST /api/campaign/[id]/engagement/fetch
 * Enqueues engagement fetches for all published content in the campaign.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import { createOrchestration } from "@/lib/orchestration";
import { decrypt } from "@/lib/crypto";
import type { SocialPlatform } from "@/types";

export const maxDuration = 120;

export async function POST(
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
    const {
      campaignRepo,
      contentRepo,
      connectedAccountRepo,
      enrichmentService,
    } = getContainer();

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
    const published = allContent.filter((c) => c.externalPostId !== null);

    if (published.length === 0) {
      return NextResponse.json({ data: { queued: 0 }, error: null });
    }

    const { queue } = createOrchestration({
      maxConcurrent: 3,
      rateLimit: 10,
    });

    const promises = published.map((content) =>
      queue.enqueue({
        id: content.id,
        agentType: "engagement_fetch",
        priority: 5,
        execute: async () => {
          const account =
            await connectedAccountRepo.findByUserAndPlatformWithTokens(
              userId,
              content.platform as SocialPlatform
            );
          if (!account) return null;

          const accessToken = decrypt(account.accessTokenEncrypted);
          return enrichmentService.fetchAndStoreEngagement(
            content.id,
            content.platform as SocialPlatform,
            content.externalPostId!,
            accessToken
          );
        },
      })
    );

    await Promise.allSettled(promises);

    return NextResponse.json({
      data: { queued: published.length },
      error: null,
    });
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
          message: "Failed to fetch engagement",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
