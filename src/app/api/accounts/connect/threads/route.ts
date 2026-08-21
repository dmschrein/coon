/**
 * Threads OAuth Connect API - Initiates the authorization code flow.
 *
 * POST /api/accounts/connect/threads
 * Returns the Threads authorization URL. Threads authorizes against the same
 * Meta app as Instagram, so when an Instagram account is already connected the
 * response also advertises the shortcut endpoint that trades that connection's
 * token for a Threads one instead of a second OAuth round-trip.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdapter } from "@/lib/services/social";
import { getContainer } from "@/lib/core/di/container";

const SHORTCUT_ENDPOINT = "/api/accounts/connect/threads/instagram";

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

    const adapter = getAdapter("threads");
    if (!adapter) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Threads is not configured",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounts/callback/threads`;
    const state = Buffer.from(
      JSON.stringify({ userId, platform: "threads" })
    ).toString("base64url");

    const authUrl = adapter.getAuthUrl(redirectUri, state);

    const { publishService } = getContainer();
    const accounts = await publishService.getConnectedAccounts(userId);
    const linkedPlatform = adapter.linkedPlatform;
    const shortcutAvailable =
      !!linkedPlatform &&
      !!adapter.exchangeLinkedToken &&
      accounts.some((a) => a.platform === linkedPlatform && a.isActive);

    return NextResponse.json({
      data: {
        authUrl,
        instagramShortcut: {
          available: shortcutAvailable,
          endpoint: shortcutAvailable ? SHORTCUT_ENDPOINT : null,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("Error initiating Threads OAuth:", error);
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
