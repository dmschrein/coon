import { anthropic } from "@/lib/claude";
import { pinterestContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  PinterestContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create a Pinterest pin brief for this marketing campaign.

## Campaign Context
- Campaign: ${strategy.campaignName}
- Theme: ${strategy.theme}
- Goal: ${strategy.goal}
- Core Message: ${strategy.messagingFramework.coreMessage}
- Tone: ${strategy.messagingFramework.toneGuidelines}

## Content Pillars
${strategy.contentPillars.map((p) => `- ${p.theme}: ${p.description}`).join("\n")}

## Audience Context
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Pain Points: ${profile.psychographics.frustrations.join(", ")}
- Keywords: ${profile.keywords.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Differentiators: ${quiz.differentiators.join(", ")}

## Pinterest-Specific Requirements
- Pinterest is a visual search engine — keywords matter more than hashtags
- Pin title: clear, keyword-rich (under 100 chars)
- Description: max 500 characters, front-load keywords
- Image description should guide a designer to create a vertical pin (2:3 ratio)
- Include bold text overlay suggestions in the image description
- Board suggestion should match how your target audience organizes saves
- Think about what someone would search to find this pin

Generate a JSON object:
{
  "pinTitle": "string - keyword-rich pin title",
  "description": "string - SEO-optimized description under 500 chars",
  "boardSuggestion": "string - ideal board name to pin this to",
  "imageDescription": "string - detailed visual brief for a designer (vertical 2:3 ratio, text overlays, colors, style)",
  "keywords": ["string - 8-12 Pinterest search keywords"],
  "altText": "string - accessible alt text describing the pin image"
}`;
}

export async function generatePinterestContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: PinterestContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a Pinterest marketing expert who understands visual search optimization and pin design. You create pins that rank in Pinterest search and drive saves and clicks. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = pinterestContentSchema.parse(parsed);

    return {
      content: validated as PinterestContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
