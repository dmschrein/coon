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

    const { audienceService } = getContainer();
    const profile = await audienceService.getActiveProfile(userId);

    return NextResponse.json({ data: profile || null, error: null });
  } catch (error) {
    console.error("Error fetching audience profile:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch audience profile",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
