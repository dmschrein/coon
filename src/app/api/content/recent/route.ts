import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError, z } from "zod";
import { getContainer } from "@/lib/core/di/container";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const { limit } = querySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const { contentRepo } = getContainer();
    const items = await contentRepo.findRecentByUserId(userId, limit);

    return NextResponse.json({ data: items, error: null });
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

    console.error("Error fetching recent content:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch recent content",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
