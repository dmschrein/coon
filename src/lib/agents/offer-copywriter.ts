import { anthropic } from "@/lib/claude";
import { tierCopyOutputSchema } from "@/lib/validations/tier";
import { extractJSON, withRetry } from "./utils";
import type { BillingCycle } from "@/lib/validations/tier";

const MODEL = "claude-sonnet-4-20250514";

export interface TierCopyInput {
  audienceSummary: string;
  communityName: string;
  priceCents: number;
  billingCycle: BillingCycle;
  tierGoal: string;
}

export interface TierCopyOutput {
  name: string;
  tagline: string;
  description: string;
  benefits: string[];
}

function formatPrice(cents: number, cycle: BillingCycle): string {
  const dollars = (cents / 100).toFixed(0);
  const cycleLabel =
    cycle === "monthly" ? "/month" : cycle === "yearly" ? "/year" : " one-time";
  return `$${dollars}${cycleLabel}`;
}

function buildPrompt(input: TierCopyInput): string {
  return `Write paid membership tier copy for "${input.communityName}".

## Tier Context
- Community: ${input.communityName}
- Price: ${formatPrice(input.priceCents, input.billingCycle)}
- Goal of this tier: ${input.tierGoal}

## Audience
${input.audienceSummary}

## Copywriting Rules
- Write outcome-oriented benefits — what members ACHIEVE, BUILD, LAUNCH, EARN, UNLOCK, MASTER, GROW, CREATE, or DEVELOP.
- DO NOT use generic "Access to X" or "Get access to Y" phrasing. Every benefit MUST start with an outcome-driven action verb.
- Each benefit should be specific, concrete, and tied to a real result the member walks away with.
- Avoid corporate filler. Sound like one human pitching to another.
- Return between 5 and 8 benefits (inclusive).
- "name" is a short, memorable tier name (2-4 words).
- "tagline" is a one-line value proposition under 100 characters.
- "description" is 1-2 sentences explaining who this tier is for.

Return ONLY JSON in this shape:
{
  "name": "string - short tier name",
  "tagline": "string - one-line value prop",
  "description": "string - 1-2 sentences",
  "benefits": [
    "Launch your first ...",
    "Master the ...",
    "Build a ...",
    "Earn ...",
    "Unlock ..."
  ]
}`;
}

export async function writeTierCopy(input: TierCopyInput): Promise<{
  result: TierCopyOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system:
        "You are an expert offer copywriter who writes outcome-driven membership tier benefits. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = tierCopyOutputSchema.parse(parsed);

    return {
      result: validated as TierCopyOutput,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
