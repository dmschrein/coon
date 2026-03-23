import { anthropic } from "@/lib/claude";
import { linkedinContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  LinkedInContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create LinkedIn content for this marketing campaign.

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
- Job Titles: ${profile.demographics.jobTitles.join(", ")}
- Motivations: ${profile.psychographics.motivations.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Business Model: ${quiz.businessModel}
- Primary Goal: ${quiz.primaryGoal}

## LinkedIn-Specific Requirements
- Post: 1300 characters is the sweet spot (before "see more" truncation)
- Use line breaks liberally — single-sentence paragraphs perform best
- Open with a bold, contrarian, or story-driven first line
- Professional but conversational — LinkedIn rewards authenticity
- Include an article outline option for deeper thought leadership
- Hashtags: 3-5 targeted hashtags (not too many)
- End with a question to drive comments

Generate a JSON object:
{
  "post": "string - the full LinkedIn post with line breaks (\\n) for formatting, optimized for the feed",
  "articleOutline": {
    "title": "string - LinkedIn article title for deeper thought leadership",
    "sections": ["string - 4-6 article section headings with brief notes on content"]
  },
  "hashtags": ["string - 3-5 professional hashtags with # prefix"],
  "toneGuidance": "string - specific guidance on how to deliver this content (e.g., 'Share as a personal story from the founder's perspective')"
}`;
}

export async function generateLinkedInContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: LinkedInContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a LinkedIn thought leadership strategist who creates posts that build authority and drive engagement. You understand LinkedIn's algorithm and what makes professionals stop scrolling. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = linkedinContentSchema.parse(parsed);

    return {
      content: validated as LinkedInContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
