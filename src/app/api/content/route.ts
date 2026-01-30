import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  contentItems,
  audienceProfiles,
  quizResponses,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateContent } from "@/lib/agents/content-generation";
import { logAgentRun } from "@/lib/agents/utils";
import type { AudienceProfile, QuizResponse } from "@/types";

export const maxDuration = 120;

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");
    const status = url.searchParams.get("status");

    let query = db
      .select()
      .from(contentItems)
      .where(eq(contentItems.userId, userId))
      .orderBy(desc(contentItems.createdAt));

    const items = await query;

    // Filter in JS since Drizzle dynamic where is verbose
    let filtered = items;
    if (platform) {
      filtered = filtered.filter((item) => item.platform === platform);
    }
    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }

    return NextResponse.json({ data: filtered, error: null });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch content", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    // Fetch active audience profile
    const [profile] = await db
      .select()
      .from(audienceProfiles)
      .where(
        and(
          eq(audienceProfiles.userId, userId),
          eq(audienceProfiles.isActive, true)
        )
      )
      .orderBy(desc(audienceProfiles.generatedAt))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message:
              "No audience profile found. Generate an audience profile first.",
            code: "NO_PROFILE",
          },
        },
        { status: 400 }
      );
    }

    // Fetch quiz response for platform preferences
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
            message: "No quiz response found.",
            code: "NO_QUIZ_RESPONSE",
          },
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    try {
      const profileData = profile.profileData as AudienceProfile;
      const quizData = quizResponse.responseData as QuizResponse;

      const result = await generateContent(profileData, quizData);
      const durationMs = Date.now() - startTime;

      // Insert each draft as a separate content item
      const insertedItems = await db
        .insert(contentItems)
        .values(
          result.drafts.map((draft) => ({
            userId,
            audienceProfileId: profile.id,
            platform: draft.platform,
            contentType: draft.contentType,
            pillar: draft.pillar,
            title: draft.draft.headline || null,
            body: draft.draft.body,
            hashtags: draft.draft.hashtags || null,
            cta: draft.draft.cta || null,
            status: "draft",
          }))
        )
        .returning();

      // Log the agent run
      await logAgentRun({
        userId,
        agentType: "content_generation",
        inputData: { profileId: profile.id, quizResponseId: quizResponse.id },
        outputData: { strategy: result.strategy, draftCount: result.drafts.length },
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        durationMs,
        status: "success",
      });

      return NextResponse.json({ data: insertedItems, error: null });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await logAgentRun({
        userId,
        agentType: "content_generation",
        inputData: { profileId: profile.id },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate content. Please try again.",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
