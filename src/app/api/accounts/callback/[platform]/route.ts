/**
 * OAuth Callback API - Handles OAuth redirect from social platforms.
 *
 * GET /api/accounts/callback/[platform]?code=...&state=...
 * Exchanges auth code for tokens and saves connected account.
 */

import { NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";
import type { SocialPlatform } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return NextResponse.redirect(
        `${baseUrl}/dashboard/campaign?error=oauth_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Missing code or state parameter",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    // Decode state to get userId
    let stateData: { userId: string; platform: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    } catch {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Invalid state parameter",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounts/callback/${platform}`;

    const { publishService } = getContainer();
    await publishService.handleOAuthCallback(
      stateData.userId,
      platform as SocialPlatform,
      code,
      redirectUri
    );

    // Redirect back to the app with success
    return NextResponse.redirect(
      `${baseUrl}/dashboard/campaign?connected=${platform}`
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/dashboard/campaign?error=oauth_failed`
    );
  }
}
