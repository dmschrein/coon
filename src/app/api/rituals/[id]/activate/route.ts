import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import { activateRitualSchema } from "@/lib/validations/ritual";

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

    const { id } = await params;
    const body = await req.json();
    const { campaignId } = activateRitualSchema.parse(body);

    const { ritualService } = getContainer();
    const result = await ritualService.activate(id, userId, campaignId);

    return NextResponse.json({ data: result, error: null });
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

    if (error instanceof ServiceError) {
      const status =
        error.code === "NOT_FOUND" || error.code === "CAMPAIGN_NOT_FOUND"
          ? 404
          : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error activating ritual:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to activate ritual", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
