/**
 * Analytics Insights Agent - Analyzes campaign metrics and generates
 * AI recommendations + audience profile updates.
 */

import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import type { AnalyticsInsightsInput, AnalyticsInsightsResult } from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildInsightsPrompt(input: AnalyticsInsightsInput): string {
  const platforms = input.platformBreakdown
    .map(
      (p) =>
        `- ${p.platform}: reach=${p.reach}, impressions=${p.impressions}, engagements=${p.engagements}, rate=${p.engagementRate}%`
    )
    .join("\n");

  const pillars = input.pillarBreakdown
    .map(
      (p) =>
        `- ${p.pillar}: reach=${p.totalReach}, engagements=${p.totalEngagements}, avg_rate=${p.avgEngagementRate}%, posts=${p.contentCount}`
    )
    .join("\n");

  const topContent = input.contentRankings
    .slice(0, 10)
    .map(
      (c) =>
        `- "${c.title ?? "Untitled"}" (${c.platform}/${c.pillar ?? "none"}): reach=${c.reach}, engagements=${c.engagements}, rate=${c.engagementRate}%`
    )
    .join("\n");

  return `Analyze this campaign's performance data and provide actionable insights.

## Campaign
- Name: ${input.campaignName}
- Strategy: ${input.strategySummary}

## Platform Performance
${platforms}

## Content Pillar Performance
${pillars}

## Top Content
${topContent}

## Your Task
Return a JSON object:
{
  "insights": ["string - key findings about what's working and what's not (3-5)"],
  "recommendations": ["string - specific, actionable next steps (3-5)"],
  "audienceUpdates": {
    "confidenceLevel": "quiz_based" | "data_informed" | "data_validated",
    "newPatterns": ["string - new audience behavior patterns discovered from the data (2-3)"]
  }
}

Focus on:
- Which platforms deliver the best ROI
- Which content pillars resonate most
- Audience engagement patterns
- Specific improvements for underperforming areas
- Whether enough data exists to upgrade confidence level`;
}

export async function generateAnalyticsInsights(
  input: AnalyticsInsightsInput
): Promise<{
  result: AnalyticsInsightsResult;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildInsightsPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a data-driven marketing analyst who translates campaign metrics into actionable insights. Respond with valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text) as AnalyticsInsightsResult;

    return {
      result: parsed,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
