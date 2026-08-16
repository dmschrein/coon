/**
 * Publish Content API - Publishes approved content to social platform.
 *
 * POST /api/campaign/[id]/publish/[contentId]
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getContainer } from "@/lib/core/di/container";

const publishOptionsSchema = z.object({
  boardId: z.string().min(1).optional(),
});

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

    const { contentId } = await params;
    // Body is optional — only platforms with a publish-time choice send one.
    const body = await req.json().catch(() => ({}));
    const parsed = publishOptionsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Invalid publish options",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const { publishService } = getContainer();
    const result = await publishService.publishContent(
      userId,
      contentId,
      parsed.data
    );

    if (result.status === "failed") {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: result.error ?? "Publish failed",
            code: "PUBLISH_FAILED",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    console.error("Error publishing content:", error);
    const message =
      error instanceof Error ? error.message : "Failed to publish";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
