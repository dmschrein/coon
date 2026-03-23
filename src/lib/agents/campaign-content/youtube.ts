import { anthropic } from "@/lib/claude";
import { youtubeContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  YouTubeContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create a complete YouTube video brief for this marketing campaign.

## Campaign Context
- Campaign: ${strategy.campaignName}
- Theme: ${strategy.theme}
- Goal: ${strategy.goal}
- Core Message: ${strategy.messagingFramework.coreMessage}
- Tone: ${strategy.messagingFramework.toneGuidelines}
- Key Phrases: ${strategy.messagingFramework.keyPhrases.join(", ")}

## Content Pillars
${strategy.contentPillars.map((p) => `- ${p.theme}: ${p.description} (Topics: ${p.sampleTopics.join(", ")})`).join("\n")}

## Audience Context
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Pain Points: ${profile.psychographics.frustrations.join(", ")}
- Goals: ${profile.psychographics.goals.join(", ")}
- Content They Consume: ${profile.behavioralPatterns.contentConsumption.join(", ")}
- Keywords: ${profile.keywords.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Primary Goal: ${quiz.primaryGoal}
- Business Model: ${quiz.businessModel}

## YouTube-Specific Requirements
- Title: max 60 characters, curiosity-driven, keyword-rich
- Description: include timestamps, links section, and keyword-rich summary
- Intro hook: first 30 seconds must convince viewers to keep watching
- Script body: 8-15 minute video broken into clear segments with retention hooks
- Include a pattern interrupt every 2-3 minutes to maintain attention
- CTA: subscribe, comment, or link in description
- Thumbnail concept: describe what would make someone click
- Tags: 10-15 relevant search terms

Generate a JSON object:
{
  "title": "string - YouTube title under 60 chars",
  "description": "string - full YouTube description with timestamps, summary, and links section placeholder",
  "tags": ["string - 10-15 search-optimized tags"],
  "thumbnailConcept": "string - detailed thumbnail concept (facial expression, text overlay, colors, composition)",
  "script": {
    "introHook": "string - the first 30 seconds that hook viewers (address their pain point immediately)",
    "bodySegments": [
      {
        "segmentTitle": "string - segment topic",
        "content": "string - full script for this segment including transitions and retention hooks",
        "timestamp": "string - e.g., '0:30', '3:45'"
      }
    ],
    "cta": "string - call to action near the end",
    "outro": "string - closing script with next video tease"
  }
}`;
}

export async function generateYouTubeContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: YouTubeContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system:
        "You are a YouTube content strategist and scriptwriter who creates videos optimized for watch time, CTR, and subscriber growth. You understand YouTube SEO, retention patterns, and thumbnail psychology. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = youtubeContentSchema.parse(parsed);

    return {
      content: validated as YouTubeContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
