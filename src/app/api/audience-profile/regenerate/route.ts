import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";

export const maxDuration = 60;

export async function POST() {
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

    const { audienceService } = getContainer();
    const newProfile = await audienceService.regenerateProfile(userId);

    return NextResponse.json({ data: newProfile, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status =
        error.code === "NO_QUIZ_RESPONSE"
          ? 400
          : error.code === "AGENT_FAILED"
            ? 500
            : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error regenerating audience profile:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
