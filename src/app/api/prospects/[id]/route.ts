import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { updateProspectSchema } from "@/lib/validations/prospect";

export async function GET(
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
    const { prospectRepo } = getContainer();
    const prospect = await prospectRepo.getProspect(id);

    if (!prospect || prospect.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Prospect not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: prospect, error: null });
  } catch (error) {
    console.error("Error fetching prospect:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch prospect", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

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
    const patch = updateProspectSchema.parse(body);

    const { prospectRepo } = getContainer();
    const existing = await prospectRepo.getProspect(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Prospect not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const updated = await prospectRepo.updateProspect(id, patch);

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

    console.error("Error updating prospect:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to update prospect", code: "INTERNAL_ERROR" },
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
    const { prospectRepo } = getContainer();
    const existing = await prospectRepo.getProspect(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Prospect not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    await prospectRepo.deleteProspect(id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error("Error deleting prospect:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to delete prospect", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
