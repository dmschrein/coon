/**
 * OAuth Connect API - Initiates OAuth flow for a social platform.
 *
 * POST /api/accounts/connect/[platform]
 * Returns the OAuth authorization URL for the platform.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdapter } from "@/lib/services/social";
import type { SocialPlatform } from "@/types";

const VALID_PLATFORMS: SocialPlatform[] = [
  "reddit",
  "instagram",
  "twitter",
  "tiktok",
  "youtube",
  "threads",
  "linkedin",
];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> }
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

    const { platform } = await params;
    if (!VALID_PLATFORMS.includes(platform as SocialPlatform)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: `Unsupported platform: ${platform}`,
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const adapter = getAdapter(platform as SocialPlatform);
    if (!adapter) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: `Platform ${platform} is not yet supported`,
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounts/callback/${platform}`;
    const state = Buffer.from(JSON.stringify({ userId, platform })).toString(
      "base64url"
    );

    const authUrl = adapter.getAuthUrl(redirectUri, state);

    return NextResponse.json({ data: { authUrl }, error: null });
  } catch (error) {
    console.error("Error initiating OAuth:", error);
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
