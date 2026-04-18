import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

export const maxDuration = 120;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; contentId: string }> }
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

    const { id: campaignId, contentId } = await params;
    const { campaignService } = getContainer();

    await campaignService.regenerateContent(campaignId, contentId, userId);

    return NextResponse.json({
      data: { status: "regenerated" },
      error: null,
    });
  } catch (error) {
    console.error("Error regenerating content:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "AGENT_FAILED" },
      },
      { status: 500 }
    );
  }
}
