/**
 * Twitter OAuth Connect API - Initiates the OAuth2 PKCE flow.
 *
 * POST /api/accounts/connect/twitter
 * Generates a PKCE verifier/challenge pair, stores the verifier in a secure
 * cookie, and returns the Twitter authorization URL.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  TwitterAdapter,
  TWITTER_CODE_VERIFIER_COOKIE,
} from "@/lib/services/social/twitter";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/crypto";

export async function POST() {
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

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounts/callback/twitter`;
    const state = Buffer.from(
      JSON.stringify({ userId, platform: "twitter" })
    ).toString("base64url");

    const adapter = new TwitterAdapter();
    const authUrl = adapter.getAuthUrl(redirectUri, state, codeChallenge);

    const res = NextResponse.json({ data: { authUrl }, error: null });
    res.cookies.set(TWITTER_CODE_VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (error) {
    console.error("Error initiating Twitter OAuth:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to initiate connection",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
