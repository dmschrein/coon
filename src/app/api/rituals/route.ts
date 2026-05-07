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

    const { ritualService } = getContainer();
    const items = await ritualService.listTemplates(userId);

    return NextResponse.json({ data: { items }, error: null });
  } catch (error) {
    console.error("Error fetching ritual templates:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch ritual templates",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
