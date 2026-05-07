import { anthropic } from "@/lib/claude";
import { replyDraftOutputSchema } from "@/lib/validations/inbox";
import { extractJSON, withRetry } from "./utils";

const MODEL = "claude-sonnet-4-20250514";

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  linkedin: 2200,
  reddit: 2200,
  threads: 500,
  tiktok: 2200,
  discord: 2000,
  youtube: 2200,
};

export interface ReplyDraftInput {
  originalPost: string;
  incomingMessage: string;
  platform: string;
  authorHandle: string;
  audienceContext?: string;
}

export interface ReplyDraft {
  text: string;
  tone: string;
  rationale: string;
}

export interface ReplyDraftResult {
  drafts: ReplyDraft[];
}

function buildPrompt(input: ReplyDraftInput): string {
  const charLimit = PLATFORM_CHAR_LIMITS[input.platform] ?? 2200;

  return `You are an expert community manager. Draft replies to an engagement message.

## Context
- Platform: ${input.platform}
- Character limit: ${charLimit} characters per reply
- Author: ${input.authorHandle}
${input.audienceContext ? `- Audience context: ${input.audienceContext}` : ""}

## Original Post
${input.originalPost}

## Incoming Message from ${input.authorHandle}
${input.incomingMessage}

## Instructions
Generate exactly 3 reply drafts with different tones:
1. Affirming — warm, appreciative, validates their perspective
2. Curious — asks a follow-up question, deepens the conversation
3. Value-adding — shares an insight, tip, or resource that helps them

Each reply MUST be under ${charLimit} characters. Be authentic and conversational, not corporate. Match the platform's communication style.

Return a JSON object:
{
  "drafts": [
    {
      "text": "string - the reply text, under ${charLimit} chars",
      "tone": "string - affirming | curious | value-adding",
      "rationale": "string - why this reply works for engaging this person"
    }
  ]
}`;
}

export async function draftReply(input: ReplyDraftInput): Promise<{
  result: ReplyDraftResult;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert community manager and engagement strategist. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = replyDraftOutputSchema.parse(parsed);

    // Enforce character limits
    const charLimit = PLATFORM_CHAR_LIMITS[input.platform] ?? 2200;
    const trimmedDrafts = validated.drafts.map((draft) => ({
      ...draft,
      text: draft.text.slice(0, charLimit),
    }));

    return {
      result: { drafts: trimmedDrafts },
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
