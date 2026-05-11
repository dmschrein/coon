import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { partnerCreateSchema } from "@/lib/validations/partner";

export async function GET(_req: Request) {
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

    const { partnerRepo } = getContainer();
    const partners = await partnerRepo.listPartners(userId);

    return NextResponse.json({ data: partners, error: null });
  } catch (error) {
    console.error("Error fetching partners:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch partners", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
    const parsed = partnerCreateSchema.parse(body);

    const { partnerRepo } = getContainer();
    const partner = await partnerRepo.createPartner(userId, parsed);

    return NextResponse.json({ data: partner, error: null }, { status: 201 });
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

    console.error("Error creating partner:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to create partner", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
