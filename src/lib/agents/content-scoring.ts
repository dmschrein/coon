/**
 * Content Scoring Agent - Evaluates content quality across three dimensions
 * using Claude: engagement potential, brand voice alignment, and platform fit.
 */

import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import type { ContentScores, CampaignPlatform } from "@/types";

const MODEL = "claude-sonnet-4-20250514";

interface ScoreContentInput {
  platform: CampaignPlatform;
  contentData: unknown;
  title: string | null;
  body: string | null;
  strategySummary: string | null;
  audienceSummary: string | null;
}

interface ScoreContentResult {
  result: ContentScores;
  modelUsed: string;
  tokensUsed: number;
}

export async function scoreContent(
  input: ScoreContentInput
): Promise<ScoreContentResult> {
  const {
    platform,
    contentData,
    title,
    body,
    strategySummary,
    audienceSummary,
  } = input;

  const contentPreview = body
    ? body.slice(0, 2000)
    : JSON.stringify(contentData).slice(0, 2000);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert social media strategist and content evaluator. Respond with valid JSON only. No markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `Score this ${platform} content on three dimensions (1-10 each).

**Content Title:** ${title ?? "Untitled"}
**Platform:** ${platform}
**Content:**
${contentPreview}

${strategySummary ? `**Campaign Strategy:** ${strategySummary}` : ""}
${audienceSummary ? `**Target Audience:** ${audienceSummary}` : ""}

Score these dimensions:
1. **engagementPotential** (1-10): How likely this content is to generate likes, comments, shares, and saves on ${platform}. Consider hooks, calls-to-action, emotional resonance, and platform-specific engagement patterns.
2. **brandVoiceAlignment** (1-10): How well the tone, language, and messaging align with the campaign strategy and brand identity. Consider consistency, authenticity, and audience appropriateness.
3. **platformFit** (1-10): How well the content follows ${platform}-specific best practices (length, format, hashtag usage, visual requirements, posting conventions).

Also provide:
- **feedback**: Array of 2-4 specific observations about strengths and weaknesses
- **suggestions**: Array of 1-3 actionable improvements

Return JSON:
{
  "engagementPotential": number,
  "brandVoiceAlignment": number,
  "platformFit": number,
  "feedback": ["..."],
  "suggestions": ["..."]
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text) as {
      engagementPotential: number;
      brandVoiceAlignment: number;
      platformFit: number;
      feedback: string[];
      suggestions: string[];
    };

    const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));
    const engagement = clamp(parsed.engagementPotential);
    const brandVoice = clamp(parsed.brandVoiceAlignment);
    const platformFit = clamp(parsed.platformFit);
    const overallScore = Math.round(
      (engagement + brandVoice + platformFit) / 3
    );

    const scores: ContentScores = {
      engagementPotential: engagement,
      brandVoiceAlignment: brandVoice,
      platformFit: platformFit,
      overallScore,
      feedback: parsed.feedback ?? [],
      suggestions: parsed.suggestions ?? [],
      scoredAt: new Date().toISOString(),
    };

    return {
      result: scores,
      modelUsed: MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  });
}
