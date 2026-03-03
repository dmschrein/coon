import { anthropic } from "@/lib/claude";
import { discordContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  DiscordContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create Discord community content for this marketing campaign.

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
- Goals: ${profile.psychographics.goals.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}

## Discord-Specific Requirements
- Intro channel: welcoming, clear value proposition for joining the community
- General channel: conversational, sparks discussion around the campaign theme
- Showcase channel: highlight wins, builds, or progress related to the product area
- Engagement prompts: conversation starters that get people talking
- Use Discord formatting (bold, code blocks, emojis are OK here)
- Sound like a community leader, not a brand

Generate a JSON object:
{
  "introChannelMessage": "string - welcome message for #introductions or #welcome channel",
  "generalChannelMessage": "string - discussion-sparking message for #general",
  "showcaseChannelMessage": "string - message for #showcase or #wins channel that encourages sharing",
  "engagementPrompts": ["string - 3-5 conversation starters or discussion questions for the community"]
}`;
}

export async function generateDiscordContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: DiscordContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a Discord community manager who builds engaged, active communities. You create messages that spark genuine conversations and make members feel welcome. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = discordContentSchema.parse(parsed);

    return {
      content: validated as DiscordContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
