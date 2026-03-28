/**
 * Campaign Media Generation API - Generate images for all visual content.
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";

export const maxDuration = 120;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const { enrichmentService } = getContainer();
    const result = await enrichmentService.generateMediaBatch(
      campaignId,
      user.id
    );

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate media";
    return NextResponse.json(
      { data: null, error: { message, code: "MEDIA_GENERATION_ERROR" } },
      { status: 500 }
    );
  }
}
