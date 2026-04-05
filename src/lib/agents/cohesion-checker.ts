import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import {
  cohesionCheckResultSchema,
  type CohesionCheckResult,
} from "@/lib/validations/campaign";

const MODEL = "claude-sonnet-4-20250514";

export type { CohesionCheckResult };

export interface CohesionCheckInput {
  campaignName: string;
  campaignGoal: string;
  campaignTopic: string;
  strategySummary: string;
  contentPillars: { theme: string; description: string }[];
  contentPieces: {
    id: string;
    platform: string;
    contentType: string | null;
    title: string | null;
    pillar: string | null;
    body: string | null;
  }[];
}

function buildCohesionPrompt(input: CohesionCheckInput): string {
  const pillars = input.contentPillars
    .map((p) => `- ${p.theme}: ${p.description}`)
    .join("\n");

  const pieces = input.contentPieces
    .map(
      (p) =>
        `### [${p.id}] ${p.platform} (${p.contentType ?? "post"})
- Pillar: ${p.pillar ?? "none"}
- Title: ${p.title ?? "untitled"}
- Body:
${p.body ?? "(no body yet)"}`
    )
    .join("\n\n");

  return `You are a brand consistency auditor reviewing a multi-platform marketing campaign.

Analyze ALL content pieces below for cohesion. Every piece should serve the same campaign goal, maintain consistent messaging, and feel like it comes from the same voice — while appropriately adapting to each platform's style.

## Campaign
- Goal: ${input.campaignGoal}
- Topic: ${input.campaignTopic}
- Strategy Summary: ${input.strategySummary}

## Content Pillars
${pillars}

## Content Pieces
${pieces}

## Your Task

Evaluate and score (0-100) each dimension:

1. **Messaging Consistency** — Is the core message aligned across all pieces?
2. **Tone Consistency** — Does the voice feel like the same person? (Account for platform-appropriate variation — Reddit should be more casual than LinkedIn, but the underlying personality should match)
3. **Factual Consistency** — Any conflicting numbers, claims, dates, or offers?
4. **Strategic Alignment** — Does every piece serve the campaign goal?

For each flag, specify:
- The dimension it belongs to
- The specific content piece IDs involved
- What the inconsistency is
- How to fix it

Also provide 3-5 specific, actionable recommendations. Each recommendation must reference the content piece IDs it applies to.

Return JSON matching this exact schema:
{
  "overall_score": number (0-100, weighted average of dimensions),
  "messaging": {
    "score": number (0-100),
    "flags": [{ "dimension": "messaging", "content_ids": ["id1", "id2"], "issue": "description", "fix": "how to fix" }]
  },
  "tone": {
    "score": number (0-100),
    "flags": [{ "dimension": "tone", "content_ids": [...], "issue": "...", "fix": "..." }]
  },
  "factual": {
    "score": number (0-100),
    "flags": [{ "dimension": "factual", "content_ids": [...], "issue": "...", "fix": "..." }]
  },
  "strategic": {
    "score": number (0-100),
    "flags": [{ "dimension": "strategic", "content_ids": [...], "issue": "...", "fix": "..." }]
  },
  "recommendations": [{ "text": "actionable recommendation", "content_ids": ["id1"], "priority": "high" | "medium" | "low" }]
}`;
}

export async function checkCampaignCohesion(
  input: CohesionCheckInput
): Promise<{
  result: CohesionCheckResult;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildCohesionPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system:
        "You are a brand consistency auditor who evaluates multi-platform marketing campaigns for cohesion across messaging, tone, facts, and strategic alignment. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = cohesionCheckResultSchema.parse(parsed);

    return {
      result: validated,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
