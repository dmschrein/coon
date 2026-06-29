import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
    { status: 401 }
  );
}

/** GET — return the user's onboarding sequence with its steps (or null). */
export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { onboardingRepo } = getContainer();
    const sequence = await onboardingRepo.getSequence(userId);

    return NextResponse.json({ data: { sequence }, error: null });
  } catch (error) {
    console.error("Error fetching onboarding sequence:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch onboarding sequence",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
