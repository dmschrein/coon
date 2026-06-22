import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { sponsorUpdateSchema } from "@/lib/validations/sponsor";

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
    const { sponsorRepo } = getContainer();
    const sponsor = await sponsorRepo.getSponsor(id);

    if (!sponsor || sponsor.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Sponsor not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: sponsor, error: null });
  } catch (error) {
    console.error("Error fetching sponsor:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch sponsor", code: "INTERNAL_ERROR" },
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
    const patch = sponsorUpdateSchema.parse(body);

    const { sponsorRepo } = getContainer();
    const existing = await sponsorRepo.getSponsor(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Sponsor not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const updated = await sponsorRepo.updateSponsor(id, patch);

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

    console.error("Error updating sponsor:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to update sponsor", code: "INTERNAL_ERROR" },
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
    const { sponsorRepo } = getContainer();
    const existing = await sponsorRepo.getSponsor(id);

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Sponsor not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    await sponsorRepo.deleteSponsor(id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error("Error deleting sponsor:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to delete sponsor", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
