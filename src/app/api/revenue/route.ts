import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { revenueCreateSchema } from "@/lib/validations/revenue";

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

    const { revenueRepo } = getContainer();
    const entries = await revenueRepo.listEntries(userId);

    return NextResponse.json({ data: entries, error: null });
  } catch (error) {
    console.error("Error fetching revenue entries:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch revenue entries",
          code: "INTERNAL_ERROR",
        },
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
    const parsed = revenueCreateSchema.parse(body);

    const { revenueRepo } = getContainer();
    const entry = await revenueRepo.createEntry(userId, parsed);

    return NextResponse.json({ data: entry, error: null }, { status: 201 });
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

    console.error("Error creating revenue entry:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to create revenue entry",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
