import { anthropic } from "@/lib/claude";
import { instagramContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  InstagramContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create an Instagram content brief for this marketing campaign.

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
- Hashtags: ${profile.hashtags.join(", ")}
- Age Range: ${profile.demographics.ageRange[0]}-${profile.demographics.ageRange[1]}

## Product Context
- Product: ${quiz.elevatorPitch}
- Differentiators: ${quiz.differentiators.join(", ")}

## Instagram-Specific Requirements
- Caption max: 2200 characters (aim for 150-300 words for engagement)
- Hashtags: up to 30 (mix of high-volume and niche)
- Carousel: 5-10 slides for maximum engagement
- Each slide needs text content AND an image description for a designer
- Open with a scroll-stopping first line
- End caption with a question or CTA to drive comments
- Use line breaks for readability

Generate a JSON object:
{
  "carouselSlides": [
    {
      "slideNumber": 1,
      "text": "string - the text content for this slide",
      "imageDescription": "string - detailed description for a designer to create the visual",
      "altText": "string - accessibility alt text for the image"
    }
  ],
  "caption": "string - full Instagram caption with line breaks (\\n)",
  "hashtags": ["string - up to 30 relevant hashtags with # prefix"],
  "postingTimeSuggestion": "string - optimal posting time",
  "contentType": "carousel|reel|story|single"
}`;
}

export async function generateInstagramContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: InstagramContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a top Instagram content strategist who creates viral carousel posts and engaging captions. You understand the Instagram algorithm and design content for maximum reach and saves. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = instagramContentSchema.parse(parsed);

    return {
      content: validated as InstagramContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
