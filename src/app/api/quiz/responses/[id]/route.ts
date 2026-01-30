import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { quizResponses } from "@/lib/db/schema";

// ─── GET /api/quiz/responses/[id] ───────────────────────────────────────────
// Retrieve a single quiz response by ID for the authenticated user.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const [response] = await db
      .select()
      .from(quizResponses)
      .where(
        and(eq(quizResponses.id, id), eq(quizResponses.userId, userId))
      );

    if (!response) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Quiz response not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: response, error: null });
  } catch (error) {
    console.error("[GET /api/quiz/responses/[id]]", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
