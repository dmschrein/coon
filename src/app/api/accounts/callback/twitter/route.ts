/**
 * Twitter OAuth Callback API - Completes the OAuth2 PKCE flow.
 *
 * GET /api/accounts/callback/twitter?code=...&state=...
 * Reads the PKCE code verifier from the cookie set during connect, exchanges
 * code + verifier for tokens, and saves the connected account.
 */

import { NextRequest, NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";
import { TWITTER_CODE_VERIFIER_COOKIE } from "@/lib/services/social/twitter";

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

    const codeVerifier = req.cookies.get(TWITTER_CODE_VERIFIER_COOKIE)?.value;
    if (!codeVerifier) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/settings?tab=accounts&error=oauth_failed`
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

    const redirectUri = `${baseUrl}/api/accounts/callback/twitter`;

    const { publishService } = getContainer();
    await publishService.handleOAuthCallback(
      stateData.userId,
      "twitter",
      code,
      redirectUri,
      codeVerifier
    );

    const res = NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=accounts&connected=twitter`
    );
    res.cookies.delete(TWITTER_CODE_VERIFIER_COOKIE);
    return res;
  } catch (error) {
    console.error("Twitter OAuth callback error:", error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?tab=accounts&error=oauth_failed`
    );
  }
}
