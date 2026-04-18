/**
 * Campaign Analytics API - Get and generate campaign analytics.
 *
 * GET  /api/campaign/[id]/analytics — Get latest analytics snapshot
 * POST /api/campaign/[id]/analytics — Generate new insights from metrics
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

export const maxDuration = 120;

export async function GET(
  _req: Request,
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

    const { id } = await params;
    const { analyticsService } = getContainer();
    const analytics = await analyticsService.getCampaignAnalytics(id, userId);

    return NextResponse.json({ data: analytics, error: null });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch analytics",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  _req: Request,
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

    const { id } = await params;
    const { analyticsService } = getContainer();
    const analytics = await analyticsService.generateInsights(id, userId);

    return NextResponse.json({ data: analytics, error: null });
  } catch (error) {
    console.error("Error generating analytics:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate analytics";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
