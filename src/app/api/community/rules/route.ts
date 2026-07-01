import { CLAUDE_MODEL } from "@/lib/model";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { generateCommunityRules } from "@/lib/agents/rules-generator";
import { logAgentRun } from "@/lib/agents/utils";
import {
  rulesRequestSchema,
  rulesSaveSchema,
} from "@/lib/validations/community";
import type { RulesInput, RulesOutput } from "@/types";

export const maxDuration = 120;

const MODEL = CLAUDE_MODEL;

function unauthorized() {
  return NextResponse.json(
    { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
    { status: 401 }
  );
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { communityConfigRepo } = getContainer();
    const config = await communityConfigRepo.getConfig(userId);

    return NextResponse.json({ data: config?.rules ?? null, error: null });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch rules", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { rules } = rulesSaveSchema.parse(await req.json());

    const { communityConfigRepo } = getContainer();
    const saved = await communityConfigRepo.upsertConfig(userId, { rules });

    return NextResponse.json({ data: saved.rules, error: null });
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

    console.error("Error saving rules:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to save rules", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const body = rulesRequestSchema.parse(await req.json());

    const { communityConfigRepo, quizRepo, communityPipeline } = getContainer();

    const quiz = await quizRepo.findLatestByUserId(userId);
    if (!quiz) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Complete the onboarding quiz before generating rules.",
            code: "NO_QUIZ_RESPONSE",
          },
        },
        { status: 400 }
      );
    }

    const existing = await communityConfigRepo.getConfig(userId);
    const input: RulesInput = {
      communityName:
        existing?.manifesto?.nameSuggestions?.[0] ?? "your community",
      niche: quiz.responseData.industryNiche.join(", "),
      platform: quiz.responseData.preferredPlatforms?.[0] ?? "your platform",
      tone: body.tone ?? "professional",
      existingValues: existing?.manifesto?.values?.map((v) => v.name),
    };

    const startTime = Date.now();
    try {
      const step = await communityPipeline.executeStep<
        RulesInput,
        RulesOutput["rules"]
      >("community_rules", input, async (i) => {
        const r = await generateCommunityRules(i);
        return { data: r.rules, tokensUsed: r.tokensUsed };
      });

      const saved = await communityConfigRepo.upsertConfig(userId, {
        rules: step.data,
      });

      await logAgentRun({
        userId,
        agentType: "community_rules",
        inputData: input,
        outputData: step.data,
        modelUsed: MODEL,
        tokensUsed: step.tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return NextResponse.json({ data: saved.rules, error: null });
    } catch (agentError) {
      await logAgentRun({
        userId,
        agentType: "community_rules",
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
          error: { message: "Failed to generate rules", code: "AGENT_FAILED" },
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

    console.error("Error generating rules:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to generate rules", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
