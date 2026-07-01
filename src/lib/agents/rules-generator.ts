import { CLAUDE_MODEL } from "@/lib/model";
import { anthropic } from "@/lib/claude";
import {
  rulesOutputSchema,
  RULES_MIN,
  RULES_MAX,
} from "@/lib/validations/community";
import { extractJSON, withRetry } from "./utils";
import type { RulesInput, RulesOutput, RulesTone } from "@/types";

const MODEL = CLAUDE_MODEL;

const TONE_GUIDANCE: Record<RulesTone, string> = {
  casual:
    "Friendly and relaxed. Use warm, encouraging enforcement language — gentle reminders, not threats.",
  professional:
    "Clear and businesslike. Use neutral, measured enforcement language.",
  strict:
    'Firm and unambiguous. Use strong enforcement language that states consequences plainly — e.g. violations "will be" removed "immediately".',
};

function buildPrompt(input: RulesInput): string {
  const values =
    input.existingValues && input.existingValues.length > 0
      ? input.existingValues.join(", ")
      : "(none provided)";

  return `You are a community-management expert writing the ground rules for a community before it launches.

## Community
- Name: ${input.communityName}
- Niche: ${input.niche}
- Platform: ${input.platform}
- Existing values: ${values}

## Tone: ${input.tone}
${TONE_GUIDANCE[input.tone]}

Generate a JSON object with this exact structure:
{
  "rules": [
    {
      "title": "string - a positively framed rule name",
      "description": "string - one or two sentences explaining the rule",
      "exampleViolation": "string - a concrete example of behavior that breaks the rule",
      "enforcement": "string - what happens when the rule is broken"
    }
  ]
}

Constraints:
- Provide between ${RULES_MIN} and ${RULES_MAX} rules.
- Frame every title POSITIVELY — describe what to DO, not what to avoid. Write "Share your work openly", never "Don't lurk" or "No self-promo".
- No title may start with "Don't" or "No ".
- Make every rule SPECIFIC to the "${input.niche}" niche — reference its context, behaviors, or language. Never use generic rules like "Be respectful" on their own.
- Every rule MUST include a concrete, niche-specific exampleViolation and an enforcement note.
- Match the requested tone (${input.tone}) in the enforcement language.`;
}

export async function generateCommunityRules(input: RulesInput): Promise<{
  rules: RulesOutput["rules"];
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert community manager. You always respond with valid JSON matching the exact schema requested. No markdown, no explanation — only the JSON object.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = rulesOutputSchema.parse(parsed);

    return {
      rules: validated.rules as RulesOutput["rules"],
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
