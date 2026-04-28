import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { updateInboxStatusSchema } from "@/lib/validations/inbox";
import { ZodError } from "zod";

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

    const { id } = await params;
    const body = await req.json();
    const { status } = updateInboxStatusSchema.parse(body);

    const { inboxRepo } = getContainer();
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

    const updated = await inboxRepo.updateStatus(id, status);

    return NextResponse.json({ data: updated, error: null });
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

    console.error("Error updating inbox item:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to update inbox item",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
