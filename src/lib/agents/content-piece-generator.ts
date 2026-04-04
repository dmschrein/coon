import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import {
  contentPieceOutputSchema,
  type ContentPieceOutput,
} from "@/lib/validations/content-piece";
import type { AudienceProfile, CampaignPlatform, ContentPillar } from "@/types";

const MODEL = "claude-sonnet-4-20250514";

export interface ContentBrief {
  platform: CampaignPlatform;
  contentType: string;
  pillar: string;
  title: string;
  targetCommunity?: string;
}

export interface ContentPieceContext {
  audienceProfile: AudienceProfile;
  strategySummary: string;
  contentPillars: ContentPillar[];
  campaignGoal: string;
  campaignTopic: string;
}

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  reddit: `Reddit: Write an authentic personal story or genuinely helpful educational content. Write like a real community member. No self-promotion. Match the subreddit's tone. Use Reddit markdown formatting.`,
  instagram: `Instagram: Visual-first caption with hook line, body, and CTA. Suggest 3-5 carousel slide descriptions or image concepts. Include 15-20 relevant hashtags.`,
  tiktok: `TikTok: Script format — Hook (first 3 seconds), Body (key points with text overlay suggestions), CTA. Suggest trending audio style. Keep under 60 seconds.`,
  threads: `Threads: Conversational, opinion-driven, or hot-take style. 2-4 sentences max. Designed to spark replies.`,
  youtube: `YouTube: Full video script with intro hook (30 sec), 2-3 body sections, outro CTA. Include thumbnail concept. Target 5-10 min.`,
  twitter: `Twitter: Punchy, engagement-optimized. Thread format if >280 chars. Use line breaks for readability.`,
  blog: `Blog: Long-form educational article with clear headers, body sections, internal linking suggestions, and a strong CTA. Include meta description and keywords.`,
  linkedin: `LinkedIn: Professional tone, thought-leadership style. Share insights, lessons learned, or industry observations. Include a call for discussion.`,
  pinterest: `Pinterest: SEO-optimized pin title and description. Suggest board placement, image description, and keywords for discoverability.`,
  discord: `Discord: Community-focused messages for different channels (intro, general, showcase). Include engagement prompts and conversation starters.`,
  email: `Email: Newsletter format with compelling subject line, preview text, body sections with headings, and clear CTA buttons. Include segmentation suggestions.`,
};

function buildPrompt(
  brief: ContentBrief,
  context: ContentPieceContext
): string {
  const pillarDetail = context.contentPillars.find(
    (p) => p.theme === brief.pillar
  );

  const platformGuide =
    PLATFORM_INSTRUCTIONS[brief.platform] ??
    `Write native content for ${brief.platform}.`;

  return `You are a content creator writing for ${brief.platform}. Generate a complete, ready-to-post content draft.

## Audience
- Personas: ${context.audienceProfile.primaryPersonas.map((p) => `${p.name}: ${p.description} (Pain points: ${p.painPoints.join(", ")})`).join("\n  ")}
- Values: ${context.audienceProfile.psychographics.values.join(", ")}
- Motivations: ${context.audienceProfile.psychographics.motivations.join(", ")}
- Keywords: ${context.audienceProfile.keywords.join(", ")}

## Campaign Strategy
${context.strategySummary}

## Content Pillar: ${brief.pillar}
${pillarDetail ? `${pillarDetail.description}\nTargeted Pain Point: ${pillarDetail.targetedPainPoint}` : ""}

## Brief
- Platform: ${brief.platform}
- Content Type: ${brief.contentType}
- Title/Direction: ${brief.title}
- Target Community: ${brief.targetCommunity ?? "general"}
- Campaign Goal: ${context.campaignGoal}
- Campaign Topic: ${context.campaignTopic}

## Platform Guidelines
${platformGuide}

## Output Format
Return a JSON object:
{
  "body": "string - the complete post body matching the platform's native style",
  "hashtags": ["string - platform-appropriate hashtag array"],
  "mediaSuggestions": [{"type": "string", "description": "string - ideal image/video for this piece"}],
  "confidenceScore": 0.0-1.0,
  "targetCommunity": "string - the specific community or audience segment"
}`;
}

export async function generateContentPiece(
  brief: ContentBrief,
  context: ContentPieceContext
): Promise<{
  output: ContentPieceOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(brief, context);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert content creator who writes platform-native content. You match the tone, format, and culture of each platform. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = contentPieceOutputSchema.parse(parsed);

    return {
      output: validated,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
