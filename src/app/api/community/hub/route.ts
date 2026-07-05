import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadCommunityHubData } from "@/lib/community/load-hub-data";

/** GET — derived community hub state: completion gates + member count. */
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

    const data = await loadCommunityHubData(userId);
    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("Error fetching community hub:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch community hub",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
