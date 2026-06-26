import { CLAUDE_MODEL } from "@/lib/model";
import { anthropic } from "@/lib/claude";
import {
  setupGuideAgentOutputSchema,
  type SetupGuideAgentOutput,
} from "@/lib/validations/community";
import { extractJSON, withRetry } from "./utils";
import type {
  AudienceProfile,
  SetupGuideInput,
  SetupGuidePlatform,
  SetupGuideOutput,
} from "@/types";

const MODEL = CLAUDE_MODEL;

// ----------------------------------------------------------------------------
// Platform-specific requirements — one named builder per platform, never one
// giant string. Each returns the platform's "## Requirements" block.
// ----------------------------------------------------------------------------

function discordRequirements(): string {
  return `## Requirements (Discord)
Build a checklist with AT LEAST these sections, each with actionable steps:
1. Server Name & Icon — name the server after the community; describe the icon.
2. Channel Structure — propose a concrete channel layout. Reference channels by their handle (e.g. #welcome, #introductions, #general). Include at least 3 channels.
3. Role Hierarchy — define 3 to 4 roles (e.g. Founder, Moderator, Founding Member).
4. Bot Recommendations — recommend exactly 3 specific, free Discord bots and what each is for.
5. Welcome Channel Setup — how to set up and pin a welcome message.
For steps that produce pasteable text (channel lists, role names, the pinned welcome copy), put that exact text in "copyReady".`;
}

function redditRequirements(): string {
  return `## Requirements (Reddit)
Build a checklist with AT LEAST these sections, each with actionable steps:
1. Subreddit Name — recommend a concrete subreddit name written as r/Name in the step text.
2. Rules Template — a starter set of community rules (put the rules in copyReady).
3. Flair Setup — recommended post flairs (put the flair names in copyReady).
4. AutoModerator Basics — one or two starter automod rules in plain language.
5. Wiki Page Structure — how to lay out the subreddit wiki.
For steps that produce pasteable text, put that exact text in "copyReady".`;
}

function genericRequirements(platform: SetupGuidePlatform): string {
  return `## Requirements (${platform})
Build a checklist with at least 4 sections covering: creating and naming the space, structuring channels/spaces, roles or moderation, and a welcome/onboarding flow for new members. For steps that produce pasteable text (names, descriptions, welcome copy), put that exact text in "copyReady".`;
}

const requirementBuilders: Record<SetupGuidePlatform, () => string> = {
  discord: discordRequirements,
  reddit: redditRequirements,
  slack: () => genericRequirements("slack"),
  circle: () => genericRequirements("circle"),
  whatsapp: () => genericRequirements("whatsapp"),
};

function audienceSummary(profile: AudienceProfile): string {
  const persona = profile.primaryPersonas?.[0]?.name ?? "the target member";
  const values = profile.psychographics?.values?.slice(0, 4).join(", ") ?? "";
  const keywords = profile.keywords?.slice(0, 6).join(", ") ?? "";
  return [
    `- Primary persona: ${persona}`,
    values ? `- Values: ${values}` : "",
    keywords ? `- Topics they care about: ${keywords}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPrompt(input: SetupGuideInput): string {
  return `You are a community operations expert who writes precise, copy-paste-ready platform setup checklists for founders.

## Community
- Name: ${input.communityName}
- Platform: ${input.platform}

## Audience
${audienceSummary(input.audienceProfile)}

${requirementBuilders[input.platform]()}

Generate a JSON object with this exact structure:
{
  "checklist": [
    {
      "section": "string - short section heading",
      "steps": [
        {
          "text": "string - one actionable instruction",
          "estimatedMinutes": 5,
          "copyReady": "string - exact pasteable text; OMIT this field entirely when the step has nothing to paste"
        }
      ]
    }
  ],
  "welcomeMessage": "string - a warm welcome message for new members"
}

Constraints:
- "estimatedMinutes" must be a positive whole number of minutes for each step.
- Only include "copyReady" when there is exact text to paste; never set it to an empty string.
- Be specific to this community and audience. Avoid generic filler.`;
}

/** Sum of every step's estimatedMinutes across all sections. */
function totalMinutes(output: SetupGuideAgentOutput): number {
  return output.checklist.reduce(
    (total, section) =>
      total +
      section.steps.reduce((sum, step) => sum + step.estimatedMinutes, 0),
    0
  );
}

export async function generatePlatformSetupGuide(
  input: SetupGuideInput
): Promise<{
  guide: SetupGuideOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert community operations specialist. You always respond with valid JSON matching the exact schema requested. No markdown, no explanation — only the JSON object.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = setupGuideAgentOutputSchema.parse(parsed);

    const guide: SetupGuideOutput = {
      checklist: validated.checklist,
      welcomeMessage: validated.welcomeMessage,
      estimatedTotalMinutes: totalMinutes(validated),
    };

    return {
      guide,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
