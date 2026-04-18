/**
 * Single Content Media API - Generate or retrieve media for one content piece.
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; contentId: string }> }
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

    const { contentId } = await params;
    const { enrichmentService } = getContainer();
    const enrichments = await enrichmentService.generateMediaForContent(
      contentId,
      user.id
    );

    return NextResponse.json({ data: enrichments, error: null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate media";
    return NextResponse.json(
      { data: null, error: { message, code: "MEDIA_GENERATION_ERROR" } },
      { status: 500 }
    );
  }
}
