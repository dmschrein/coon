/**
 * Cron Token Refresh + Engagement Refresh - Background jobs for:
 * 1. Refreshing expiring OAuth tokens
 * 2. Fetching stale engagement data for published content
 *
 * GET /api/cron/refresh-tokens
 * Secured via CRON_SECRET header. Designed for Vercel Cron or external scheduler.
 */

import { NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";
import { getAdapter } from "@/lib/services/social";
import { decrypt, encrypt } from "@/lib/crypto";
import type { SocialPlatform } from "@/types";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }
  }

  try {
    const { connectedAccountRepo } = getContainer();
    const expiring = await connectedAccountRepo.findExpiringTokens(7);

    const results: { id: string; platform: string; status: string }[] = [];

    for (const account of expiring) {
      const adapter = getAdapter(account.platform as SocialPlatform);
      if (!adapter?.refreshAccessToken) {
        results.push({
          id: account.id,
          platform: account.platform,
          status: "skipped",
        });
        continue;
      }

      try {
        const refreshToken = account.refreshTokenEncrypted
          ? decrypt(account.refreshTokenEncrypted)
          : decrypt(account.accessTokenEncrypted);

        const newTokens = await adapter.refreshAccessToken(refreshToken);

        await connectedAccountRepo.updateTokens(
          account.id,
          encrypt(newTokens.accessToken),
          newTokens.refreshToken ? encrypt(newTokens.refreshToken) : undefined,
          newTokens.expiresAt
        );

        results.push({
          id: account.id,
          platform: account.platform,
          status: "refreshed",
        });
      } catch (error) {
        console.error(`Token refresh failed for account ${account.id}:`, error);
        await connectedAccountRepo.deactivate(account.id);
        results.push({
          id: account.id,
          platform: account.platform,
          status: "deactivated",
        });
      }
    }

    // ─── Engagement Refresh ──────────────────────────────────────────────
    const engagementResults: {
      id: string;
      platform: string;
      status: string;
    }[] = [];

    try {
      const { contentRepo, enrichmentService } = getContainer();
      const staleContent = await contentRepo.findStalePublished(2);

      for (const item of staleContent) {
        try {
          const account =
            await connectedAccountRepo.findByUserAndPlatformWithTokens(
              item.userId,
              item.platform as SocialPlatform
            );
          if (!account) {
            engagementResults.push({
              id: item.id,
              platform: item.platform,
              status: "skipped_no_account",
            });
            continue;
          }

          const accessToken = decrypt(account.accessTokenEncrypted);
          await enrichmentService.fetchAndStoreEngagement(
            item.id,
            item.platform as SocialPlatform,
            item.externalPostId,
            accessToken
          );
          await contentRepo.updateLastEngagementFetch(item.id, new Date());

          engagementResults.push({
            id: item.id,
            platform: item.platform,
            status: "fetched",
          });
        } catch (error) {
          console.error(
            `Engagement fetch failed for content ${item.id}:`,
            error
          );
          engagementResults.push({
            id: item.id,
            platform: item.platform,
            status: "failed",
          });
        }
      }
    } catch (error) {
      console.error("Engagement refresh error:", error);
    }

    return NextResponse.json({
      data: {
        processed: results.length,
        results,
        engagementRefresh: {
          processed: engagementResults.length,
          results: engagementResults,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("Cron token refresh error:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Token refresh job failed", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
