import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadMonetizationHubData } from "@/lib/monetization/load-hub-data";

export async function GET(_req: Request) {
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

    const data = await loadMonetizationHubData(userId);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("Error fetching monetization hub:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch monetization hub",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
