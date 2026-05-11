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

    const { prospectRepo } = getContainer();
    const result = await prospectRepo.getGrowthAttribution(userId);

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    console.error("Error fetching growth attribution:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch growth attribution",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
