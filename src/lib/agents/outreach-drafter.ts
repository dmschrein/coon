import { anthropic } from "@/lib/claude";
import {
  workflowOutreachOutputSchema,
  type WorkflowOutreachInput,
  type WorkflowOutreachOutput,
} from "@/lib/validations/workflow";
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

const REASON_GUIDANCE: Record<string, string> = {
  new_member:
    "They just joined or first engaged with the community. Welcome them warmly. Do not pitch a product.",
  member_engaged_10:
    "They have engaged 10+ times and are an emerging advocate. Acknowledge their support and invite deeper involvement.",
  member_inactive_14d:
    "They have gone quiet for 14+ days. Re-engage gently with curiosity, not guilt. Avoid sounding desperate.",
};

function buildPrompt(input: WorkflowOutreachInput): string {
  const charLimit = PLATFORM_CHAR_LIMITS[input.platform] ?? 2200;
  const guidance =
    REASON_GUIDANCE[input.triggerReason] ??
    "Reach out personally based on the context provided.";

  return `You are writing a single, personal outreach message to a community member.

## Context
- Platform: ${input.platform}
- Character limit: ${charLimit} characters
- Member handle: ${input.memberHandle}
- Community: ${input.communityName}
- Trigger reason: ${input.triggerReason}
- Guidance: ${guidance}
${input.audienceProfile ? `- Audience profile: ${input.audienceProfile}` : ""}
${input.templateHint ? `- Tone hint: ${input.templateHint}` : ""}

## Instructions
Write ONE authentic, conversational message under ${charLimit} characters. Match the platform's communication style. Be specific to the trigger reason — do not write a generic greeting.

Choose a tone from: warm | curious | value-adding | celebratory.

Return a JSON object:
{
  "message": "string - the outreach text, under ${charLimit} chars",
  "tone": "warm | curious | value-adding | celebratory"
}`;
}

export async function draftOutreach(input: WorkflowOutreachInput): Promise<{
  result: WorkflowOutreachOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You write authentic, short outreach messages to community members. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = workflowOutreachOutputSchema.parse(parsed);

    const charLimit = PLATFORM_CHAR_LIMITS[input.platform] ?? 2200;
    return {
      result: {
        ...validated,
        message: validated.message.slice(0, charLimit),
      },
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
