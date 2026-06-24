import { CLAUDE_MODEL } from "@/lib/model";
import { anthropic } from "@/lib/claude";
import {
  manifestoOutputSchema,
  INVITATION_MIN_WORDS,
  INVITATION_MAX_WORDS,
} from "@/lib/validations/community";
import { extractJSON, withRetry } from "./utils";
import type { ManifestoInput, ManifestoOutput } from "@/types";

const MODEL = CLAUDE_MODEL;

function buildPrompt(input: ManifestoInput): string {
  return `You are a brand strategist and community-building copywriter. Craft a compelling community manifesto for a founder building an audience before launch.

## Product
- Elevator Pitch: ${input.elevatorPitch}
- Problem Solved: ${input.problemSolved}

## Audience
- Ideal Customer: ${input.idealCustomer}
- Industry / Niche: ${input.industryNiche.join(", ")}
${input.brandVoice ? `- Brand Voice: ${input.brandVoice}` : ""}

Generate a JSON object with this exact structure:
{
  "nameSuggestions": ["string", "string", "string"],
  "mission": "string - one or two sentences on why this community exists",
  "whoFor": "string - who this community is for",
  "whoNotFor": "string - who this community is NOT for",
  "values": [
    { "name": "string - short value name", "description": "string - one sentence" }
  ],
  "invitationLetter": "string - a warm, first-person letter from the founder inviting people to join"
}

Constraints:
- Provide EXACTLY 3 name suggestions.
- Provide EXACTLY 5 values, each with a name and a one-sentence description.
- The invitation letter MUST be between ${INVITATION_MIN_WORDS} and ${INVITATION_MAX_WORDS} words, written in a warm, first-person founder voice that sounds personal and human.
- Be specific to this product and audience. Avoid generic filler.`;
}

export async function generateManifesto(input: ManifestoInput): Promise<{
  manifesto: ManifestoOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert community brand strategist. You always respond with valid JSON matching the exact schema requested. No markdown, no explanation — only the JSON object.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = manifestoOutputSchema.parse(parsed);

    return {
      manifesto: validated as ManifestoOutput,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
