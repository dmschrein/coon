import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
    { status: 401 }
  );
}

function badRequest(message: string, code: string) {
  return NextResponse.json(
    { data: null, error: { message, code } },
    { status: 400 }
  );
}

/**
 * POST — activate the user's onboarding sequence, seeding calendar entries.
 * Ownership is enforced by resolving the sequence via the authenticated user.
 */
export async function POST(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { onboardingRepo } = getContainer();
    const sequence = await onboardingRepo.getSequence(userId);
    if (!sequence) {
      return badRequest(
        "Generate an onboarding sequence before activating it.",
        "NO_SEQUENCE"
      );
    }
    if (sequence.steps.length === 0) {
      return badRequest(
        "This sequence has no steps to schedule.",
        "EMPTY_SEQUENCE"
      );
    }

    const result = await onboardingRepo.activateSequence(sequence.id);

    return NextResponse.json({
      data: { sequenceId: result.sequenceId, scheduled: result.count },
      error: null,
    });
  } catch (error) {
    console.error("Error activating onboarding sequence:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to activate onboarding sequence",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
