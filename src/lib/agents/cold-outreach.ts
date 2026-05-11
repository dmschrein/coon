import { anthropic } from "@/lib/claude";
import {
  coldOutreachOutputSchema,
  type ColdOutreachOutput,
} from "@/lib/validations/prospect";
import type { AudienceProfile } from "@/types";
import { extractJSON, withRetry } from "./utils";

const MODEL = "claude-sonnet-4-20250514";

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
};
const DEFAULT_CHAR_LIMIT = 500;

export interface ColdOutreachInput {
  prospect: { handle: string; platform: string; source: string };
  product: { name: string; description: string; targetAudience: string };
  audienceProfile: AudienceProfile;
  communityName: string;
}

function getCharLimit(platform: string): number {
  return PLATFORM_CHAR_LIMITS[platform] ?? DEFAULT_CHAR_LIMIT;
}

function summarizeAudience(profile: AudienceProfile): string {
  const persona = profile.primaryPersonas[0];
  const personaLine = persona
    ? `Primary persona: ${persona.name} — ${persona.description} Pain points: ${persona.painPoints.slice(0, 3).join("; ")}.`
    : "";
  const values = profile.psychographics?.values?.slice(0, 4).join(", ") ?? "";
  const frustrations =
    profile.psychographics?.frustrations?.slice(0, 3).join("; ") ?? "";
  const keywords = profile.keywords?.slice(0, 6).join(", ") ?? "";
  return [
    personaLine,
    values && `Values: ${values}.`,
    frustrations && `Frustrations: ${frustrations}.`,
    keywords && `Keywords: ${keywords}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildPrompt(input: ColdOutreachInput): string {
  const charLimit = getCharLimit(input.prospect.platform);
  const audienceSummary = summarizeAudience(input.audienceProfile);

  return `You are writing two cold outreach messages to a prospect on ${input.prospect.platform}.

## Prospect
- Handle: ${input.prospect.handle}
- Platform: ${input.prospect.platform}
- Source: ${input.prospect.source}

## Product
- Name: ${input.product.name}
- Description: ${input.product.description}
- Target audience: ${input.product.targetAudience}

## Audience Profile
${audienceSummary}

## Community
${input.communityName}

## Instructions
Write exactly 2 message variants. Each variant has an opening message AND a follow-up message to send 3 days later if there is no reply. Both must be under ${charLimit} characters.

Variant 1 — approach: "direct"
- Reference something specific you would plausibly know about ${input.prospect.handle} (their work, posts, or role).
- State a clear, low-friction reason for reaching out.
- End with one easy question.

Variant 2 — approach: "value_first"
- Lead with a concrete piece of value (a tip, resource, observation, or grounded compliment about their work) before any ask.
- The ask, if any, must come after the value and feel optional.

## Hard rules
- Each "message" and "followUp" MUST be under ${charLimit} characters.
- Do NOT mention "Claude", "AI", "language model", "automation", or "bot".
- Do NOT use the word "community" anywhere in the FIRST SENTENCE of either message (case-insensitive). It feels spammy.
- Lead with genuine curiosity or value, never a pitch.
- Sound like one human writing to another. No corporate phrasing.
- The follow-up must be lighter than the opener — never repeat the original ask verbatim, never guilt-trip.

Return a JSON object:
{
  "variants": [
    {
      "message": "string under ${charLimit} chars",
      "approach": "direct",
      "followUp": "string under ${charLimit} chars"
    },
    {
      "message": "string under ${charLimit} chars",
      "approach": "value_first",
      "followUp": "string under ${charLimit} chars"
    }
  ]
}`;
}

export async function draftColdOutreach(input: ColdOutreachInput): Promise<{
  result: ColdOutreachOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);
  const charLimit = getCharLimit(input.prospect.platform);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are an expert outreach copywriter. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = coldOutreachOutputSchema.parse(parsed);

    const approaches = validated.variants.map((v) => v.approach).sort();
    if (approaches[0] !== "direct" || approaches[1] !== "value_first") {
      throw new Error(
        "Cold outreach must include one 'direct' and one 'value_first' variant"
      );
    }

    const trimmed = validated.variants.map((v) => ({
      ...v,
      message: v.message.slice(0, charLimit),
      followUp: v.followUp.slice(0, charLimit),
    }));

    return {
      result: { variants: trimmed },
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
