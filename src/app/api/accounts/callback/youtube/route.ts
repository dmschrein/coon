/**
 * YouTube OAuth Callback API - Completes the authorization code flow.
 *
 * GET /api/accounts/callback/youtube?code=...&state=...
 * Exchanges the code for tokens, fetches the channel via
 * GET /youtube/v3/channels?mine=true, and saves both on the connected account
 * (channel_id lands in metadata so publishing never refetches it).
 */

import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=accounts&error=oauth_denied`
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

    const redirectUri = `${baseUrl}/api/accounts/callback/youtube`;

    const { publishService } = getContainer();
    await publishService.handleOAuthCallback(
      stateData.userId,
      "youtube",
      code,
      redirectUri
    );

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=accounts&connected=youtube`
    );
  } catch (error) {
    console.error("YouTube OAuth callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=accounts&error=oauth_failed`
    );
  }
}
