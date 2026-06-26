import { CLAUDE_MODEL } from "@/lib/model";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { generatePlatformSetupGuide } from "@/lib/agents/platform-setup-guide";
import { logAgentRun } from "@/lib/agents/utils";
import {
  setupGuideRequestSchema,
  setupGuideProgressSchema,
} from "@/lib/validations/community";
import { isSetupGuideComplete } from "@/lib/community/setup-guide-progress";
import type {
  SetupGuideInput,
  SetupGuideOutput,
  SetupGuideProgress,
} from "@/types";

export const maxDuration = 120;

const MODEL = CLAUDE_MODEL;

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

/** GET — return per-platform setup progress (guide + checked steps + completed). */
export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { communityConfigRepo } = getContainer();
    const config = await communityConfigRepo.getConfig(userId);

    return NextResponse.json({
      data: { setupGuides: config?.setupGuides ?? {} },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching setup guides:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch setup guides",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST — get-or-generate the guide for a platform. Idempotent: if a guide was
 * already generated, return it (preserving checked steps) instead of spending
 * another model call and wiping progress.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { platform } = setupGuideRequestSchema.parse(await req.json());

    const { communityConfigRepo, profileRepo, communityPipeline } =
      getContainer();

    const existing = await communityConfigRepo.getConfig(userId);
    const existingProgress = existing?.setupGuides?.[platform];
    if (existingProgress?.guide) {
      return NextResponse.json({ data: existingProgress, error: null });
    }

    const profile = await profileRepo.findActiveByUserId(userId);
    if (!profile) {
      return badRequest(
        "Generate an audience profile before creating a setup guide.",
        "NO_PROFILE"
      );
    }

    const communityName =
      existing?.manifesto?.nameSuggestions?.[0] ?? "your community";

    const input: SetupGuideInput = {
      platform,
      communityName,
      audienceProfile: profile.profileData,
    };

    const startTime = Date.now();
    try {
      const step = await communityPipeline.executeStep<
        SetupGuideInput,
        SetupGuideOutput
      >("community_setup_guide", input, async (i) => {
        const r = await generatePlatformSetupGuide(i);
        return { data: r.guide, tokensUsed: r.tokensUsed };
      });

      const progress: SetupGuideProgress = {
        guide: step.data,
        completedSteps: [],
        completed: false,
      };

      const setupGuides = {
        ...(existing?.setupGuides ?? {}),
        [platform]: progress,
      };
      await communityConfigRepo.upsertConfig(userId, { setupGuides });

      await logAgentRun({
        userId,
        agentType: "community_setup_guide",
        inputData: { platform, communityName },
        outputData: progress.guide,
        modelUsed: MODEL,
        tokensUsed: step.tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return NextResponse.json({ data: progress, error: null });
    } catch (agentError) {
      await logAgentRun({
        userId,
        agentType: "community_setup_guide",
        inputData: { platform, communityName },
        modelUsed: MODEL,
        durationMs: Date.now() - startTime,
        status: "failed",
        errorMessage:
          agentError instanceof Error ? agentError.message : String(agentError),
      });
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Failed to generate setup guide",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0].message, "VALIDATION_ERROR");
    }

    console.error("Error generating setup guide:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to generate setup guide",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

/** PATCH — persist which steps the user has checked; recompute `completed`. */
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { platform, completedSteps } = setupGuideProgressSchema.parse(
      await req.json()
    );

    const { communityConfigRepo } = getContainer();
    const existing = await communityConfigRepo.getConfig(userId);
    const existingProgress = existing?.setupGuides?.[platform];
    if (!existingProgress?.guide) {
      return badRequest(
        "Generate the setup guide before saving progress.",
        "NO_GUIDE"
      );
    }

    const progress: SetupGuideProgress = {
      ...existingProgress,
      completedSteps,
      completed: isSetupGuideComplete(existingProgress.guide, completedSteps),
    };

    const setupGuides = {
      ...(existing?.setupGuides ?? {}),
      [platform]: progress,
    };
    await communityConfigRepo.upsertConfig(userId, { setupGuides });

    return NextResponse.json({ data: progress, error: null });
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0].message, "VALIDATION_ERROR");
    }

    console.error("Error saving setup guide progress:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to save setup guide progress",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
