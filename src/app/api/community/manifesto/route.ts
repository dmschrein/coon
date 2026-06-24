import { CLAUDE_MODEL } from "@/lib/model";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { generateManifesto } from "@/lib/agents/manifesto-generator";
import { logAgentRun } from "@/lib/agents/utils";
import { manifestoRequestSchema } from "@/lib/validations/community";
import type { ManifestoInput, ManifestoOutput } from "@/types";

export const maxDuration = 120;

const MODEL = CLAUDE_MODEL;

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
    { status: 401 }
  );
}

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { communityConfigRepo } = getContainer();
    const config = await communityConfigRepo.getConfig(userId);

    return NextResponse.json({ data: config?.manifesto ?? null, error: null });
  } catch (error) {
    console.error("Error fetching manifesto:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch manifesto", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const body = manifestoRequestSchema.parse(await req.json());

    const { communityConfigRepo, quizRepo, profileRepo, communityPipeline } =
      getContainer();

    const quiz = await quizRepo.findLatestByUserId(userId);
    if (!quiz) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message:
              "Complete the onboarding quiz before generating a manifesto.",
            code: "NO_QUIZ_RESPONSE",
          },
        },
        { status: 400 }
      );
    }

    const profile = await profileRepo.findActiveByUserId(userId);
    const input: ManifestoInput = {
      elevatorPitch: quiz.responseData.elevatorPitch,
      problemSolved: quiz.responseData.problemSolved,
      idealCustomer: quiz.responseData.idealCustomer,
      industryNiche: quiz.responseData.industryNiche,
      brandVoice: profile?.profileData.brandVoice?.summary,
    };

    const startTime = Date.now();
    try {
      const step = await communityPipeline.executeStep<
        ManifestoInput,
        ManifestoOutput
      >("community_manifesto", input, async (i) => {
        const r = await generateManifesto(i);
        return { data: r.manifesto, tokensUsed: r.tokensUsed };
      });

      const generated = step.data;
      const existing = await communityConfigRepo.getConfig(userId);

      // Section-level regenerate replaces just one field; otherwise replace all.
      const manifesto: ManifestoOutput =
        body.regenerate && body.section && existing?.manifesto
          ? ({
              ...existing.manifesto,
              [body.section]: generated[body.section],
            } as ManifestoOutput)
          : generated;

      const saved = await communityConfigRepo.upsertConfig(userId, {
        manifesto,
      });

      await logAgentRun({
        userId,
        agentType: "community_manifesto",
        inputData: input,
        outputData: manifesto,
        modelUsed: MODEL,
        tokensUsed: step.tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return NextResponse.json({ data: saved.manifesto, error: null });
    } catch (agentError) {
      await logAgentRun({
        userId,
        agentType: "community_manifesto",
        inputData: input,
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
            message: "Failed to generate manifesto",
            code: "AGENT_FAILED",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          data: null,
          error: { message: error.issues[0].message, code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    console.error("Error generating manifesto:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to generate manifesto",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
