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

    const { revenueRepo } = getContainer();
    const summary = await revenueRepo.getMRRSummary(userId);

    return NextResponse.json({ data: summary, error: null });
  } catch (error) {
    console.error("Error fetching revenue summary:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch revenue summary",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
