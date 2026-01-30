import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { quizResponses, audienceProfiles } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { analyzeAudience } from "@/lib/agents/audience-analysis";
import { logAgentRun } from "@/lib/agents/utils";
import type { QuizResponse } from "@/types";

export const maxDuration = 60;

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Fetch the most recent quiz response
    const [quizResponse] = await db
      .select()
      .from(quizResponses)
      .where(eq(quizResponses.userId, userId))
      .orderBy(desc(quizResponses.completedAt))
      .limit(1);

    if (!quizResponse) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "No quiz response found. Complete the quiz first.",
            code: "NO_QUIZ_RESPONSE",
          },
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    try {
      // Deactivate existing profiles
      await db
        .update(audienceProfiles)
        .set({ isActive: false })
        .where(
          and(
            eq(audienceProfiles.userId, userId),
            eq(audienceProfiles.isActive, true)
          )
        );

      // Run the audience analysis agent
      const quizData = quizResponse.responseData as QuizResponse;
      const result = await analyzeAudience(quizData);
      const durationMs = Date.now() - startTime;

      // Save the new profile
      const [newProfile] = await db
        .insert(audienceProfiles)
        .values({
          userId,
          quizResponseId: quizResponse.id,
          profileData: result.profile,
          isActive: true,
        })
        .returning();

      // Log the agent run
      await logAgentRun({
        userId,
        agentType: "audience_analysis",
        inputData: quizData,
        outputData: result.profile,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        durationMs,
        status: "success",
      });

      return NextResponse.json({ data: newProfile, error: null });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await logAgentRun({
        userId,
        agentType: "audience_analysis",
        inputData: quizResponse.responseData,
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate audience profile. Please try again.",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
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
