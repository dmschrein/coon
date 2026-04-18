/**
 * Token Refresh API - Manually refresh OAuth tokens for a connected account.
 *
 * POST /api/accounts/[id]/refresh
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const { publishService } = getContainer();
    const account = await publishService.refreshAccountTokens(userId, id);

    return NextResponse.json({ data: account, error: null });
  } catch (error) {
    console.error("Error refreshing account tokens:", error);
    const message =
      error instanceof Error ? error.message : "Failed to refresh tokens";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
