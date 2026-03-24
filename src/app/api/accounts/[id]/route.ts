/**
 * Connected Account API - Disconnect a specific connected account.
 *
 * DELETE /api/accounts/[id]
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

export async function DELETE(
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
    await publishService.disconnectAccount(userId, id);

    return NextResponse.json({ data: { success: true }, error: null });
  } catch (error) {
    console.error("Error disconnecting account:", error);
    const message =
      error instanceof Error ? error.message : "Failed to disconnect";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
