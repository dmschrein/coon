import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { tierReorderSchema } from "@/lib/validations/tier";

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
    const { orderedIds } = tierReorderSchema.parse(body);

    const { tierRepo } = getContainer();
    await tierRepo.reorderTiers(userId, orderedIds);

    return NextResponse.json({ data: { orderedIds }, error: null });
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

    console.error("Error reordering tiers:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to reorder tiers", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
