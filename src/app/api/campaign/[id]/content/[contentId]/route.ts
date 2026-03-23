import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import type { ContentApprovalStatus } from "@/types";
import { z } from "zod";

const updateContentSchema = z.object({
  approvalStatus: z
    .enum(["pending_review", "approved", "rejected", "needs_revision"])
    .optional(),
  body: z.string().optional(),
});

export async function GET(
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
    const { contentRepo } = getContainer();
    const content = await contentRepo.findById(contentId);

    if (!content) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Content not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: content, error: null });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await req.json();
    const updates = updateContentSchema.parse(body);

    const { campaignService, contentRepo } = getContainer();

    if (updates.approvalStatus) {
      await campaignService.updateContentApproval(
        contentId,
        updates.approvalStatus as ContentApprovalStatus
      );
    }

    if (updates.body !== undefined) {
      await contentRepo.updateBody(contentId, updates.body);
    }

    const updated = await contentRepo.findById(contentId);

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    console.error("Error updating content:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
