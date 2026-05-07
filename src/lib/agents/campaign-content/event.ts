import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "../utils";
import {
  eventAgentOutputSchema,
  type EventAgentOutput,
} from "@/lib/validations/event";
import type { AudienceProfile, CampaignPlatform } from "@/types";

const MODEL = "claude-sonnet-4-20250514";

export interface EventAgentInput {
  eventTitle: string;
  eventDescription: string;
  platform: CampaignPlatform;
  eventDatetime: string;
  audienceProfile: AudienceProfile;
}

const PLATFORM_GUIDANCE: Record<string, string> = {
  twitter: "Max 280 characters. Punchy hook. One emoji max.",
  linkedin: "150-300 words. Professional tone. Open with a hook line.",
  reddit: "Conversational. Title-style first line, then body. No hashtags.",
  discord: "Casual, community-first tone. 1-3 short paragraphs.",
  instagram: "Short caption + 5-8 hashtags. Visual-first framing.",
  threads: "Conversational, 2-3 short posts read as one. Max 500 chars each.",
  tiktok: "Hook script + on-screen text idea. Casual, energetic.",
  youtube: "Community-tab post style. 100-200 words.",
  hackernews: "Plain text, no marketing speak. Factual title.",
  producthunt: "Excited but specific. Mention the maker angle.",
  indiehackers: "Builder-to-builder voice. Share the why.",
};

function buildPrompt(input: EventAgentInput): string {
  const guidance =
    PLATFORM_GUIDANCE[input.platform] ??
    "Keep it concise and platform-appropriate.";
  const personas = input.audienceProfile.primaryPersonas
    .map((p) => `${p.name}: ${p.description}`)
    .join("; ");
  const painPoints =
    input.audienceProfile.psychographics.frustrations.join(", ");

  return `You are drafting a 3-post promotion sequence for an upcoming event.

## Event
- Title: ${input.eventTitle}
- Description: ${input.eventDescription}
- Date/Time: ${input.eventDatetime}
- Platform: ${input.platform}

## Audience
- Personas: ${personas}
- Pain points: ${painPoints}
- Keywords: ${input.audienceProfile.keywords.join(", ")}

## Sequence (write all three)
1. **announcement** — goes live 7 days before the event. Build anticipation and explain why this matters to the audience. Encourage RSVPs/saves.
2. **reminder** — goes live 1 day before the event. Re-hook attention. Lean on FOMO and specificity (what they'll learn / who'll be there).
3. **day_of** — goes live ~2 hours before the event starts. Final call. "Starting soon" energy. One clear ask.

Each post must:
- Be tailored to the audience above (their voice, their language).
- Follow this platform's conventions: ${guidance}
- Stand on its own — readers may only see one of the three.

Return JSON only (no markdown, no commentary):
{
  "posts": [
    { "type": "announcement", "text": "..." },
    { "type": "reminder", "text": "..." },
    { "type": "day_of", "text": "..." }
  ]
}`;
}

export async function generateEventContent(
  input: EventAgentInput
): Promise<{ content: EventAgentOutput; tokensUsed: number }> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system:
        "You are a community-event marketer who writes platform-native promotion sequences. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = eventAgentOutputSchema.parse(parsed);

    return {
      content: validated,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
