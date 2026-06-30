import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { onboardingSaveRequestSchema } from "@/lib/validations/onboarding";

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

/** GET — return the user's onboarding sequence with its steps (or null). */
export async function GET() {
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

/** PATCH — persist edited / reordered steps onto the user's sequence. */
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { steps } = onboardingSaveRequestSchema.parse(await req.json());

    const { onboardingRepo } = getContainer();
    const sequence = await onboardingRepo.getSequence(userId);
    if (!sequence) {
      return badRequest(
        "Generate an onboarding sequence before saving changes.",
        "NO_SEQUENCE"
      );
    }

    for (const step of steps) {
      await onboardingRepo.upsertStep(sequence.id, {
        stepNumber: step.stepNumber,
        triggerTiming: step.triggerTiming,
        channel: step.channel,
        subject: step.subject ?? null,
        content: step.content,
      });
    }

    const updated = await onboardingRepo.getSequence(userId);
    return NextResponse.json({ data: { sequence: updated }, error: null });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0].message, "VALIDATION_ERROR");
    }

    console.error("Error saving onboarding sequence:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to save onboarding sequence",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
