import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { monetizationConfigSchema } from "@/lib/validations/monetization";

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

    const { monetizationConfigRepo } = getContainer();
    const config = await monetizationConfigRepo.getConfig(userId);

    return NextResponse.json({ data: config, error: null });
  } catch (error) {
    console.error("Error fetching monetization config:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch monetization config",
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
    const parsed = monetizationConfigSchema.parse(body);

    const { monetizationConfigRepo } = getContainer();
    const config = await monetizationConfigRepo.upsertConfig(userId, parsed);

    return NextResponse.json({ data: config, error: null });
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

    console.error("Error saving monetization config:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to save monetization config",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
