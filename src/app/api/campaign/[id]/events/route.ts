import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import { eventInputSchema } from "@/lib/validations/event";

export async function POST(
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

    const { id: campaignId } = await params;

    const body = await req.json().catch(() => null);
    const parsed = eventInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Invalid event input",
            code: "VALIDATION_ERROR",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { eventService } = getContainer();
    const result = await eventService.createEventSequence(
      campaignId,
      userId,
      parsed.data
    );

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "UNAUTHORIZED"
            ? 401
            : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error creating event sequence:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
