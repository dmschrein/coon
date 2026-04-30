import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { updateMemberSchema } from "@/lib/validations/member";

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
    const { platformMemberRepo } = getContainer();
    const member = await platformMemberRepo.getMember(id);

    if (!member || member.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Member not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: member, error: null });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch member", code: "INTERNAL_ERROR" },
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
    const patch = updateMemberSchema.parse(body);

    const { platformMemberRepo } = getContainer();
    const existing = await platformMemberRepo.getMember(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Member not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const updated = await platformMemberRepo.updateMember(id, patch);

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

    console.error("Error updating member:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to update member", code: "INTERNAL_ERROR" },
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
    const { platformMemberRepo } = getContainer();
    const existing = await platformMemberRepo.getMember(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Member not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    await platformMemberRepo.deleteMember(id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to delete member", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
