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
  scheduledFor: z.string().datetime().optional(),
  hashtags: z.array(z.string()).optional(),
  targetCommunity: z.string().optional(),
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

    if (updates.scheduledFor) {
      await campaignService.scheduleContent(
        contentId,
        userId,
        new Date(updates.scheduledFor)
      );
    }

    if (updates.hashtags) {
      await contentRepo.updateHashtags(contentId, updates.hashtags);
    }

    if (updates.targetCommunity !== undefined) {
      await contentRepo.updateTargetCommunity(
        contentId,
        updates.targetCommunity
      );
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

export async function DELETE(
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
    const { campaignService } = getContainer();

    await campaignService.deleteContent(contentId, userId);

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (error) {
    console.error("Error deleting content:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
