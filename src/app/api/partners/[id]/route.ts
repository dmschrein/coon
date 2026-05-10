import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { partnerUpdateSchema } from "@/lib/validations/partner";

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
    const patch = partnerUpdateSchema.parse(body);

    const { partnerRepo } = getContainer();
    const existing = await partnerRepo.getPartner(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Partner not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const updated = await partnerRepo.updatePartner(id, patch);

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

    console.error("Error updating partner:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to update partner", code: "INTERNAL_ERROR" },
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
    const { partnerRepo } = getContainer();
    const existing = await partnerRepo.getPartner(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Partner not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    await partnerRepo.deletePartner(id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error("Error deleting partner:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to delete partner", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
