/**
 * Moderation Checker Agent — classifies inbox messages for spam, toxicity,
 * off-topic, or self-promotion content. Conservative on softer categories.
 */

import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import {
  moderationCheckerOutputSchema,
  type ModerationCheckerInput,
  type ModerationCheckerOutput,
} from "@/lib/validations/inbox";

const MODEL = "claude-sonnet-4-20250514";

export type ModerationInput = ModerationCheckerInput;
export type ModerationOutput = ModerationCheckerOutput;

export interface CheckModerationResult {
  result: ModerationOutput;
  modelUsed: string;
  tokensUsed: number;
}

export async function checkModeration(
  input: ModerationInput
): Promise<CheckModerationResult> {
  const { messageText, authorHandle, platform } = input;
  const messagePreview = messageText.slice(0, 2000);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are a community-moderation classifier for a creator's social-media inbox. Respond with valid JSON only. No markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `Classify the following ${platform} message from @${authorHandle}.

**Message:**
${messagePreview}

**Categories:**
- spam: scams, mass-marketing links, repetitive promotional content, phishing
- toxicity: harassment, hate speech, slurs, threats, severe abuse
- off-topic: completely unrelated to the creator's niche or post
- self-promotion: the author shilling their own product/service in someone else's space

**Rules:**
1. Flag spam and toxicity confidently when present.
2. Be conservative for off-topic and self-promotion: only flag if VERY obvious (e.g. blatant "DM me to buy followers"); a normal mention of one's work is NOT self-promotion.
3. Default to flagged=false when uncertain.
4. confidence is 0.0–1.0. High (>=0.8) for clear cases; lower for ambiguous ones.
5. reason is a one-sentence explanation for the human moderator.

Return JSON only:
{
  "flagged": boolean,
  "reason": "short explanation, omit if flagged=false",
  "confidence": number between 0 and 1,
  "category": "spam" | "toxicity" | "off-topic" | "self-promotion" (omit if flagged=false)
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = moderationCheckerOutputSchema.parse(parsed);

    return {
      result: validated,
      modelUsed: MODEL,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  });
}
