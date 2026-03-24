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
