import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { tierCreateSchema } from "@/lib/validations/tier";

export async function GET() {
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

    const { tierRepo } = getContainer();
    const tiers = await tierRepo.listTiers(userId);

    return NextResponse.json({ data: tiers, error: null });
  } catch (error) {
    console.error("Error fetching tiers:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch tiers", code: "INTERNAL_ERROR" },
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
    const parsed = tierCreateSchema.parse(body);

    const { tierRepo } = getContainer();
    const tier = await tierRepo.createTier(userId, parsed);

    return NextResponse.json({ data: tier, error: null }, { status: 201 });
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

    console.error("Error creating tier:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to create tier", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
