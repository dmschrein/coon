import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";

export async function GET(
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

    const { campaign, content } = await campaignService.getCampaign(
      campaignId,
      userId
    );

    const totalPieces = content.length;
    const completedPieces = content.filter(
      (c: { status: string }) => c.status === "complete"
    ).length;
    const failedPieces = content.filter(
      (c: { status: string }) => c.status === "failed"
    ).length;
    const strategyComplete = !!campaign.strategySummary;

    // Determine which platforms are represented and current generating platform
    const platforms = [
      ...new Set(content.map((c: { platform: string }) => c.platform)),
    ];
    const generatingPiece = content.find(
      (c: { status: string }) => c.status === "generating"
    );

    let progress = 0;
    if (totalPieces > 0) {
      // Strategy is ~10% of the work, content is 90%
      const strategyProgress = strategyComplete ? 10 : 0;
      const contentProgress =
        totalPieces > 0 ? Math.round((completedPieces / totalPieces) * 90) : 0;
      progress = strategyProgress + contentProgress;
    } else if (strategyComplete) {
      progress = 10;
    }

    return NextResponse.json({
      data: {
        status: campaign.status,
        strategyComplete,
        totalPieces,
        completedPieces,
        failedPieces,
        platforms,
        currentPlatform: generatingPiece?.platform ?? null,
        progress,
      },
      error: null,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error fetching generation status:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
