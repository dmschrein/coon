/**
 * Cron Token Refresh - Background job to refresh expiring OAuth tokens.
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

    return NextResponse.json({
      data: { processed: results.length, results },
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
