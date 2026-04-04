import { NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";

export const maxDuration = 300;

export async function POST(
  req: Request,
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

    const { id: campaignId } = await params;
    const { campaignService } = getContainer();

    // Validate the campaign can be generated before kicking off background work
    const { campaign } = await campaignService.getCampaign(campaignId, userId);
    if (!campaign.canRunFullGeneration()) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Campaign must be in draft status to generate",
            code: "INVALID_STATE",
          },
        },
        { status: 400 }
      );
    }

    // Run the full pipeline in the background
    after(async () => {
      try {
        await campaignService.generateFullCampaign(campaignId, userId);
      } catch (error) {
        console.error("Background campaign generation failed:", error);
      }
    });

    return NextResponse.json({
      data: { campaignId, status: "generating" },
      error: null,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "UNAUTHORIZED"
            ? 401
            : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error triggering generation:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
