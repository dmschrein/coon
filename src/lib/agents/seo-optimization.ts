/**
 * SEO Optimization Agent - Analyzes content for hashtag optimization,
 * SEO quality (blog), and optimal posting times.
 */

import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import type {
  CampaignPlatform,
  SeoOptimizationData,
  HashtagAnalysis,
  SeoAnalysis,
  PostingTimeRecommendation,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

interface OptimizeContentInput {
  platform: CampaignPlatform;
  contentData: unknown;
  title: string | null;
  body: string | null;
  strategySummary: string | null;
  audienceSummary: string | null;
}

interface OptimizeContentResult {
  result: SeoOptimizationData;
  modelUsed: string;
  tokensUsed: number;
}

const HASHTAG_PLATFORMS = new Set<CampaignPlatform>([
  "instagram",
  "twitter",
  "tiktok",
  "linkedin",
  "threads",
  "pinterest",
  "youtube",
]);

export async function optimizeContent(
  input: OptimizeContentInput
): Promise<OptimizeContentResult> {
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

  const isBlog = platform === "blog";
  const needsHashtags = HASHTAG_PLATFORMS.has(platform);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert social media strategist and SEO specialist. Respond with valid JSON only. No markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `Optimize this ${platform} content.

**Content Title:** ${title ?? "Untitled"}
**Platform:** ${platform}
**Content:**
${contentPreview}

${strategySummary ? `**Campaign Strategy:** ${strategySummary}` : ""}
${audienceSummary ? `**Target Audience:** ${audienceSummary}` : ""}

Provide the following in JSON:

${
  needsHashtags
    ? `"hashtags": {
  "current": [hashtags already in the content],
  "suggested": [5-10 new hashtags to add, optimized for ${platform} discovery],
  "trending": [2-4 currently trending hashtags relevant to this content],
  "removed": [any current hashtags that should be removed],
  "reasoning": "brief explanation of hashtag strategy"
},`
    : ""
}

${
  isBlog
    ? `"seo": {
  "keywordDensity": {"keyword": density_as_decimal, ...},
  "missingKeywords": ["keywords that should be added"],
  "metaDescriptionScore": 1-10,
  "headingStructureScore": 1-10,
  "readabilityScore": 1-10,
  "suggestions": ["actionable SEO improvements"]
},`
    : ""
}

"postingTime": {
  "bestTime": "HH:MM" (24hr format, the single best time to post on ${platform}),
  "timezone": "America/New_York",
  "reasoning": "why this time works for ${platform} and this audience",
  "alternativeTimes": ["HH:MM", "HH:MM"] (2 alternative good times)
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text) as {
      hashtags?: HashtagAnalysis;
      seo?: SeoAnalysis;
      postingTime: PostingTimeRecommendation;
    };

    const result: SeoOptimizationData = {
      postingTime: parsed.postingTime,
      optimizedAt: new Date().toISOString(),
    };

    if (parsed.hashtags) {
      result.hashtags = parsed.hashtags;
    }
    if (parsed.seo) {
      result.seo = parsed.seo;
    }

    return {
      result,
      modelUsed: MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  });
}
