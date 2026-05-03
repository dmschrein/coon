import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { moderationActionSchema } from "@/lib/validations/inbox";

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

    const { id } = await params;
    const body = await req.json();
    const { action } = moderationActionSchema.parse(body);

    const { inboxRepo, inboxService } = getContainer();
    const existing = await inboxRepo.getItem(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Inbox item not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const result = await inboxService.moderateInboxItem(id, userId, action);

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: error.issues[0].message,
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    console.error("Error moderating inbox item:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to moderate inbox item",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
