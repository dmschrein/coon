import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  contentIds: z.array(z.string()).min(1),
  approvalStatus: z.enum([
    "pending_review",
    "approved",
    "rejected",
    "needs_revision",
  ]),
});

const bulkActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("schedule"),
    contentIds: z.array(z.string().uuid()).min(1),
    scheduledFor: z.string().datetime(),
  }),
  z.object({
    action: z.literal("regenerate"),
    contentIds: z.array(z.string().uuid()).min(1),
  }),
]);

export async function PATCH(
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

    const body = await req.json();
    const { contentIds, approvalStatus } = bulkUpdateSchema.parse(body);

    const { campaignService } = getContainer();
    await campaignService.bulkUpdateApproval(contentIds, approvalStatus);

    return NextResponse.json({
      data: { updated: contentIds.length },
      error: null,
    });
  } catch (error) {
    console.error("Error bulk updating content:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Invalid request body", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

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
    const body = await req.json();
    const input = bulkActionSchema.parse(body);
    const { campaignService } = getContainer();

    if (input.action === "schedule") {
      await campaignService.bulkScheduleContent(
        input.contentIds,
        userId,
        new Date(input.scheduledFor)
      );
      return NextResponse.json({
        data: { scheduled: input.contentIds.length },
        error: null,
      });
    }

    if (input.action === "regenerate") {
      const results = await Promise.allSettled(
        input.contentIds.map((contentId) =>
          campaignService.regenerateContent(campaignId, contentId, userId)
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return NextResponse.json({
        data: { regenerated: succeeded, failed },
        error: null,
      });
    }
  } catch (error) {
    console.error("Error in bulk action:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Invalid request body", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
