import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { revenueUpdateSchema } from "@/lib/validations/revenue";

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
    const patch = revenueUpdateSchema.parse(body);

    const { revenueRepo } = getContainer();
    const existing = await revenueRepo.getEntry(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Revenue entry not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const updated = await revenueRepo.updateEntry(id, patch);
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

    console.error("Error updating revenue entry:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to update revenue entry",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { revenueRepo } = getContainer();
    const existing = await revenueRepo.getEntry(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Revenue entry not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    await revenueRepo.deleteEntry(id);
    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error("Error deleting revenue entry:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to delete revenue entry",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
