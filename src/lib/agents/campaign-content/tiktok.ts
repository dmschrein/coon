import { anthropic } from "@/lib/claude";
import { tiktokContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  TikTokContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create a TikTok video brief for this marketing campaign.

## Campaign Context
- Campaign: ${strategy.campaignName}
- Theme: ${strategy.theme}
- Goal: ${strategy.goal}
- Core Message: ${strategy.messagingFramework.coreMessage}
- Tone: ${strategy.messagingFramework.toneGuidelines}
- Key Phrases: ${strategy.messagingFramework.keyPhrases.join(", ")}

## Content Pillars
${strategy.contentPillars.map((p) => `- ${p.theme}: ${p.description}`).join("\n")}

## Audience Context
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Pain Points: ${profile.psychographics.frustrations.join(", ")}
- Content They Consume: ${profile.behavioralPatterns.contentConsumption.join(", ")}
- Age Range: ${profile.demographics.ageRange[0]}-${profile.demographics.ageRange[1]}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Primary Goal: ${quiz.primaryGoal}

## TikTok-Specific Requirements
- The HOOK (first 3 seconds) is everything — make it impossible to scroll past
- Target video length: 30-90 seconds for maximum reach
- Shot list should be practical and filmable with a smartphone
- Include trending-style hooks (e.g., "POV:", "Nobody talks about this but...", "3 things I wish I knew...")
- Music/sound suggestions should reference popular categories or moods
- Caption should complement the video, not repeat it
- Hashtags should mix trending and niche tags

Generate a JSON object:
{
  "hook": "string - the first 3 seconds hook (what the viewer sees/hears immediately)",
  "scriptBody": "string - the full video script after the hook with natural speaking cadence",
  "cta": "string - what you want viewers to do (follow, comment, share, link in bio)",
  "shotList": [
    {
      "shotNumber": 1,
      "description": "string - what's happening visually in this shot",
      "duration": "string - e.g., '3 seconds', '5-8 seconds'",
      "angle": "string - e.g., 'talking head close-up', 'screen recording', 'product demo', 'text overlay on b-roll'"
    }
  ],
  "musicSuggestions": ["string - 2-3 music/sound suggestions by mood or trending category"],
  "trendingHashtags": ["string - 5-10 hashtags mixing trending and niche"],
  "caption": "string - TikTok caption (keep it punchy, under 150 chars ideal)"
}`;
}

export async function generateTikTokContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: TikTokContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a viral TikTok content creator and short-form video strategist. You understand TikTok's algorithm, trending formats, and how to create hooks that stop the scroll. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = tiktokContentSchema.parse(parsed);

    return {
      content: validated as TikTokContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
