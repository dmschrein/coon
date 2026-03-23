import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";

export const maxDuration = 120;

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

    const plan = await campaignService.generatePlan(campaignId, userId);

    return NextResponse.json({ data: plan, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "INVALID_STATE"
            ? 400
            : error.code === "AGENT_FAILED"
              ? 500
              : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error generating campaign plan:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
