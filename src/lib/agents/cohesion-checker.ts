import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";

const MODEL = "claude-sonnet-4-20250514";

export interface CohesionCheckInput {
  campaignName: string;
  strategySummary: string;
  contentPillars: { theme: string; description: string }[];
  contentPieces: {
    id: string;
    platform: string;
    title: string | null;
    pillar: string | null;
    body: string | null;
  }[];
}

export interface CohesionCheckResult {
  score: number;
  flaggedIssues: {
    contentId: string;
    issue: string;
    severity: "low" | "medium" | "high";
  }[];
  suggestions: string[];
}

function buildCohesionPrompt(input: CohesionCheckInput): string {
  const pieces = input.contentPieces
    .map(
      (p) =>
        `- [${p.id}] ${p.platform} | pillar: ${p.pillar ?? "none"} | title: ${p.title ?? "untitled"}\n  body: ${p.body?.slice(0, 300) ?? "(no body yet)"}`
    )
    .join("\n");

  return `Analyze the cohesion and consistency of this campaign's content.

## Campaign
- Name: ${input.campaignName}
- Strategy: ${input.strategySummary}
- Pillars: ${input.contentPillars.map((p) => `${p.theme}: ${p.description}`).join("; ")}

## Content Pieces
${pieces}

## Your Task
Return a JSON object:
{
  "score": number (0-100, where 100 = perfectly cohesive),
  "flaggedIssues": [
    {
      "contentId": "string - the [id] of the content piece",
      "issue": "string - what's inconsistent",
      "severity": "low" | "medium" | "high"
    }
  ],
  "suggestions": ["string - improvement suggestions (max 5)"]
}

Evaluate:
- Tone consistency across platforms
- Alignment with strategy and pillars
- Message coherence (no contradictions)
- Pillar coverage balance
- Brand voice uniformity`;
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
      max_tokens: 4096,
      system:
        "You are a content strategist who evaluates campaign consistency and cohesion. Respond with valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text) as CohesionCheckResult;

    return {
      result: parsed,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
