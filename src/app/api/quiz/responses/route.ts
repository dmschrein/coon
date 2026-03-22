import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { quizResponses, users } from "@/lib/db/schema";
import { fullQuizSchema } from "@/lib/validations/quiz";

// ─── POST /api/quiz/responses ────────────────────────────────────────────────
// Submit a completed quiz response and mark onboarding as complete.
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

    const parsed = fullQuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // Ensure user exists in DB (webhook may not have fired yet)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (existingUser.length === 0) {
      const clerkUser = await currentUser();
      if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
        return NextResponse.json(
          {
            data: null,
            error: {
              message: "Unable to resolve user email",
              code: "USER_SYNC_ERROR",
            },
          },
          { status: 500 }
        );
      }
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        null;
      await db
        .insert(users)
        .values({
          id: userId,
          email: clerkUser.emailAddresses[0].emailAddress,
          name,
        })
        .onConflictDoNothing();
    }

    const [newResponse] = await db
      .insert(quizResponses)
      .values({
        userId,
        responseData: parsed.data,
      })
      .returning();

    await db
      .update(users)
      .set({
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ data: { id: newResponse.id }, error: null });
  } catch (error) {
    console.error("[POST /api/quiz/responses]", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

// ─── GET /api/quiz/responses ─────────────────────────────────────────────────
// Retrieve all quiz responses for the authenticated user.
export async function GET() {
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

    const responses = await db
      .select()
      .from(quizResponses)
      .where(eq(quizResponses.userId, userId))
      .orderBy(desc(quizResponses.completedAt));

    return NextResponse.json({ data: responses, error: null });
  } catch (error) {
    console.error("[GET /api/quiz/responses]", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
