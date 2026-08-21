/**
 * Threads "Connect with Instagram" Shortcut API.
 *
 * POST /api/accounts/connect/threads/instagram
 * Trades the stored Instagram token for a Threads token through the Threads
 * token exchange endpoint and saves the Threads account — no OAuth redirect.
 * The connection is still a separate Threads account, not a shared one.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services/audience-service";

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

    const { publishService } = getContainer();
    const account = await publishService.connectViaLinkedAccount(
      userId,
      "threads"
    );

    return NextResponse.json({
      data: { connected: true, accountId: account.id },
      error: null,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        {
          data: null,
          error: { message: error.message, code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    console.error("Error connecting Threads via Instagram:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to connect Threads from Instagram",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
