/**
 * Monetization Readiness Agent — scores each selected revenue model on a 0–100 readiness scale
 * against community size + engagement benchmarks, and returns top actions per model.
 */

import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import { readinessOutputSchema } from "@/lib/validations/monetization";
import type {
  MonetizationModel,
  ReadinessInput,
  ReadinessOutput,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";
const READY_THRESHOLD = 70;

interface BenchmarkSpec {
  threshold: string;
  rationale: string;
}

const BENCHMARKS: Record<MonetizationModel, BenchmarkSpec> = {
  paid_membership: {
    threshold: "500+ members + 8+ weeks active",
    rationale:
      "Recurring revenue needs both critical mass and sustained activity so churn doesn't sink LTV.",
  },
  sponsorships: {
    threshold: "1000+ reach/post + defined niche",
    rationale:
      "Sponsors pay for niche reach. Vague audiences and small reach can't command rates.",
  },
  courses: {
    threshold: "200+ members + clear transformation",
    rationale:
      "Courses sell when there's a specific before/after; smaller audiences are fine if the promise is sharp.",
  },
  events: {
    threshold: "100+ members",
    rationale:
      "Events convert at a low single-digit rate; need enough members for any single event to draw.",
  },
  job_board: {
    threshold: "300+ professional members",
    rationale:
      "Employers pay for qualified eyeballs — generic audiences won't generate apply-to-hire ratios.",
  },
  freemium: {
    threshold: "50+ members",
    rationale:
      "Freemium only requires a working free wedge; conversion comes from product, not scale.",
  },
};

interface AssessmentResult {
  result: ReadinessOutput;
  modelUsed: string;
  tokensUsed: number;
}

export async function assessMonetizationReadiness(
  input: ReadinessInput
): Promise<AssessmentResult> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert community monetization advisor. Score each requested model honestly against the supplied benchmarks. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = readinessOutputSchema.parse(extractJSON(text));

    const normalized: ReadinessOutput = {
      ...parsed,
      models: parsed.models.map((m) => ({
        ...m,
        score: clampScore(m.score),
        readyToLaunch: clampScore(m.score) >= READY_THRESHOLD,
      })),
      overallScore: clampScore(parsed.overallScore),
    };

    return {
      result: normalized,
      modelUsed: MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  });
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildPrompt(input: ReadinessInput): string {
  const { selectedModels, community } = input;
  const benchmarkLines = selectedModels
    .map(
      (m) => `- ${m}: ${BENCHMARKS[m].threshold} — ${BENCHMARKS[m].rationale}`
    )
    .join("\n");

  return `Assess this community's readiness to launch each selected monetization model.

## Community stats
- Members: ${community.memberCount}
- Weeks active: ${community.weeksActive}
- Avg reach per post: ${community.avgReachPerPost}
- Engagement rate: ${(community.engagementRate * 100).toFixed(1)}%
- Professional members: ${community.professionalMemberCount ?? "unknown"}
- Niche defined: ${community.nicheDefined ? "yes" : "no"}
- Transformation clarity: ${community.transformationClarity}

## Models requested (${selectedModels.length})
${selectedModels.join(", ")}

## Benchmarks to score against
${benchmarkLines}

## Scoring rules
- Score each model 0–100 against its benchmark. 70+ means ready to launch.
- topActions: 1–3 concrete next steps, specific to this community's gap.
- benchmark: echo the threshold string for that model so the UI can show it.
- overallScore: weighted average across selected models, 0–100.
- summary: one sentence (<= 200 chars) on overall posture and the single biggest unlock.

Return ONLY JSON in this shape:
{
  "models": [
    {
      "name": "paid_membership",
      "score": 85,
      "benchmark": "500+ members + 8+ weeks active",
      "topActions": ["...", "...", "..."],
      "readyToLaunch": true
    }
  ],
  "overallScore": 78,
  "summary": "..."
}`;
}
