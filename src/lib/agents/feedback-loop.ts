import { anthropic } from "@/lib/claude";
import { feedbackLoopOutputSchema } from "@/lib/validations/feedback";
import { extractJSON, withRetry } from "./utils";
import type {
  FeedbackLoopInput,
  FeedbackLoopOutput,
  PostEngagementWithContext,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function formatEngagementTable(data: PostEngagementWithContext[]): string {
  return data
    .map(
      (d, i) =>
        `${i + 1}. platform=${d.platform}, pillar=${d.pillar ?? "none"}, title="${d.title ?? "untitled"}", ` +
        `likes=${d.likes}, comments=${d.comments}, shares=${d.shares}, ` +
        `reach=${d.reach}, impressions=${d.impressions}, engagementRate=${d.engagementRate}, ` +
        `scheduledFor=${d.scheduledFor ? new Date(d.scheduledFor).toISOString() : "unknown"}`
    )
    .join("\n");
}

function buildPrompt(input: FeedbackLoopInput): string {
  const engagementTable = formatEngagementTable(input.engagementData);
  const profileSummary = JSON.stringify(input.currentAudienceProfile, null, 2);
  const pillars = input.contentPillars.join(", ");

  return `You are an expert audience strategist analyzing content performance data to refine an audience profile.

## Engagement Data (${input.engagementData.length} posts)
${engagementTable}

## Current Audience Profile
${profileSummary}

## Content Pillars
${pillars}

## Your Task

1. **Identify top 20% and bottom 20% of posts** by engagement_rate.
2. **Find patterns** in the high-performing vs low-performing posts across:
   - Platform (which platforms perform best/worst)
   - Pillar (which content pillars resonate most)
   - Posting time (any time-based patterns)
3. **Propose specific changes** to the audience profile based on the evidence. Use dot-notation for nested fields (e.g. "psychographics.motivations", "contentPillars", "keywords").
4. **Only propose changes with clear evidence** from the data. If a pattern is weak or inconclusive, do not propose a change.

Return a JSON object with this exact structure:
{
  "changes": [
    {
      "field": "string - dot-notation path in the audience profile (e.g. 'keywords', 'contentPillars', 'psychographics.motivations')",
      "oldValue": "the current value at that field",
      "newValue": "the proposed new value",
      "reason": "string - evidence-based explanation referencing specific data"
    }
  ],
  "summary": "string - 2-3 sentence overview of findings and recommendations",
  "confidence": 0.0 to 1.0
}

Rules:
- confidence should reflect data quantity and pattern clarity (more data + clearer patterns = higher confidence)
- If fewer than 5 posts have engagement data, set confidence below 0.3
- Only include changes where the evidence is compelling
- The "reason" must cite specific numbers from the engagement data`;
}

export async function analyzeFeedbackLoop(input: FeedbackLoopInput): Promise<{
  result: FeedbackLoopOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  const result = await withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert audience strategist and data analyst. Analyze engagement data and propose evidence-based audience profile changes. Respond with valid JSON only. No markdown, no explanation — only the JSON object.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = feedbackLoopOutputSchema.parse(parsed);

    return {
      result: validated as FeedbackLoopOutput,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });

  return result;
}
