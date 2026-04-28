import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import { audienceProfileChangeSchema } from "@/lib/validations/feedback";

const applyRequestSchema = z.object({
  changes: z.array(audienceProfileChangeSchema).min(1),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = applyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Invalid request body", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    const { audienceService } = getContainer();
    const updatedProfile = await audienceService.applyFeedbackChanges(
      userId,
      parsed.data.changes
    );

    return NextResponse.json({ data: updatedProfile, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status: 400 }
      );
    }

    console.error("Error applying feedback changes:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
