/**
 * Pinterest OAuth Connect API - Initiates the authorization code flow.
 *
 * POST /api/accounts/connect/pinterest
 * Returns the Pinterest authorization URL. Pinterest is a confidential client
 * (app secret at token exchange), so no PKCE challenge is generated.
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

    const adapter = getAdapter("pinterest");
    if (!adapter) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Pinterest is not configured",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounts/callback/pinterest`;
    const state = Buffer.from(
      JSON.stringify({ userId, platform: "pinterest" })
    ).toString("base64url");

    const authUrl = adapter.getAuthUrl(redirectUri, state);

    return NextResponse.json({ data: { authUrl }, error: null });
  } catch (error) {
    console.error("Error initiating Pinterest OAuth:", error);
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
