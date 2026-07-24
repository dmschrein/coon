/**
 * LinkedIn OAuth Connect API - Initiates the standard authorization code flow.
 *
 * POST /api/accounts/connect/linkedin
 * Returns the LinkedIn authorization URL. LinkedIn member auth uses the plain
 * authorization code grant — no PKCE challenge is generated.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdapter } from "@/lib/services/social";

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

    const adapter = getAdapter("linkedin");
    if (!adapter) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "LinkedIn is not configured",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounts/callback/linkedin`;
    const state = Buffer.from(
      JSON.stringify({ userId, platform: "linkedin" })
    ).toString("base64url");

    const authUrl = adapter.getAuthUrl(redirectUri, state);

    return NextResponse.json({ data: { authUrl }, error: null });
  } catch (error) {
    console.error("Error initiating LinkedIn OAuth:", error);
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
