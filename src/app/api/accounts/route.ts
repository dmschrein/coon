/**
 * Connected Accounts API - List and delete connected social accounts.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

export async function GET() {
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
    const accounts = await publishService.getConnectedAccounts(userId);

    return NextResponse.json({ data: accounts, error: null });
  } catch (error) {
    console.error("Error fetching connected accounts:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch accounts",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
