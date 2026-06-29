import { CLAUDE_MODEL } from "@/lib/model";
import { anthropic } from "@/lib/claude";
import { onboardingSequenceDraftSchema } from "@/lib/validations/onboarding";
import { ONBOARDING_TIMINGS } from "@/lib/core/domain/onboarding-schedule";
import { extractJSON, withRetry } from "./utils";
import type { OnboardingInput, OnboardingStep } from "@/types";

const MODEL = CLAUDE_MODEL;

/** The fixed purpose of each step, in canonical timing order. */
const STEP_BRIEFS: Record<number, string> = {
  1: "immediate — warm welcome plus one quick win the member can do in under 2 minutes",
  2: "day 1 — the first engagement prompt that invites a low-stakes reply or action",
  3: "day 3 — introduce the community's core feature or ritual and how to take part",
  4: "day 4-7 — invite the member to contribute their first post/win",
  5: "day 14 — social proof of what members achieved plus a nudge to upgrade or refer",
};

function buildPrompt(input: OnboardingInput): string {
  const { audienceProfile: profile, communityName, productPitch } = input;

  return `Design a 5-step new-member onboarding sequence for an online community.

## Community
- Name: ${communityName ?? "this community"}
- What it offers: ${productPitch ?? "a place for the audience below to connect and grow"}

## Audience
- Personas: ${profile.primaryPersonas.map((p) => `${p.name} — ${p.description}`).join("\n  ")}
- Pain Points: ${profile.primaryPersonas.flatMap((p) => p.painPoints).join(", ")}
- Motivations: ${profile.psychographics.motivations.join(", ")}
- Frustrations: ${profile.psychographics.frustrations.join(", ")}
- Keywords: ${profile.keywords.join(", ")}

## The 5 steps (write them in EXACTLY this order)
1. ${STEP_BRIEFS[1]}
2. ${STEP_BRIEFS[2]}
3. ${STEP_BRIEFS[3]}
4. ${STEP_BRIEFS[4]}
5. ${STEP_BRIEFS[5]}

## Requirements
- Return EXACTLY 5 steps, no more, no less, in the order above.
- Default every step's channel to "email" unless another channel clearly fits better
  (allowed: "email", "discord_dm", "in_app", "sms").
- Every "email" step MUST have a punchy, non-empty subject line under 60 chars.
- Write in second person ("you"). Be specific to the audience above — no generic filler.

Return a JSON object with this exact structure:
{
  "steps": [
    {
      "channel": "email" | "discord_dm" | "in_app" | "sms",
      "subject": "string - required for email steps, otherwise may be null",
      "content": "string - the message body, ready to send"
    }
  ]
}`;
}

export async function generateOnboardingSequence(
  input: OnboardingInput
): Promise<{
  steps: OnboardingStep[];
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a community onboarding strategist who designs sequences that turn brand-new members into active contributors. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = onboardingSequenceDraftSchema.parse(parsed);

    // Assign canonical timing + step number defensively, regardless of how the
    // model ordered or labelled its output.
    const steps: OnboardingStep[] = validated.steps.map((step, i) => ({
      stepNumber: i + 1,
      triggerTiming: ONBOARDING_TIMINGS[i],
      channel: step.channel,
      subject: step.subject ?? null,
      content: step.content,
    }));

    return {
      steps,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
