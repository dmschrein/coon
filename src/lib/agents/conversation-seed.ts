import { anthropic } from "@/lib/claude";
import { conversationSeedsOutputSchema } from "@/lib/validations/conversation-seed";
import { extractJSON, withRetry } from "./utils";
import type { AudienceProfile } from "@/types";

const MODEL = "claude-sonnet-4-20250514";
const DEFAULT_COUNT = 5;

const PLATFORM_TONE: Record<string, string> = {
  reddit:
    "Direct, conversational, no marketing speak. Sound like a peer in a niche subreddit (r/startups, r/SaaS) — share an honest observation or ask a real question. Avoid emojis, hashtags, and salesy framing. Reddit users downvote anything that smells like self-promotion.",
  linkedin:
    "Professional insight with a thoughtful, opinionated edge. Frame around career, industry, or business value. Use structured hooks and a confident point of view. Light formatting (line breaks) is welcome; avoid excessive emojis. Aim for credibility over banter.",
  discord:
    "Casual, community-first, server-native. Treat the channel like a group chat among insiders — friendly, low-stakes, inviting replies. Short messages, conversational asides, light emoji use is fine. Avoid corporate phrasing.",
  twitter:
    "Punchy, opinionated, scroll-stopping. Lean into hot takes, one-liners, and contrarian angles. Stay under ~270 characters per seed. Strong hooks, minimal hedging, no jargon.",
};

const DEFAULT_TONE =
  "Conversational and audience-aware. Match the platform's native cadence and avoid cross-posting feel.";

export interface SeedInput {
  audienceProfile: AudienceProfile;
  contentPillars: string[];
  platform: string;
  count?: number;
}

export interface ConversationSeed {
  type: "question" | "poll" | "challenge" | "hot_take";
  text: string;
  follow_up?: string;
  best_time?: string;
  rationale: string;
}

export interface SeedOutput {
  seeds: ConversationSeed[];
}

function buildSeedPrompt(
  input: SeedInput & { count: number; tone: string }
): string {
  const {
    audienceProfile: profile,
    contentPillars,
    platform,
    count,
    tone,
  } = input;

  return `Generate ${count} conversation-starter "seeds" tailored for the ${platform} platform.

## Platform Tone (CRITICAL — match this voice exactly)
${tone}

## Audience
- Personas: ${profile.primaryPersonas.map((p) => `${p.name} — ${p.description}`).join("\n  ")}
- Pain Points: ${profile.primaryPersonas.flatMap((p) => p.painPoints).join(", ")}
- Persona Goals: ${profile.primaryPersonas.flatMap((p) => p.goals).join(", ")}
- Psychographic Frustrations: ${profile.psychographics.frustrations.join(", ")}
- Psychographic Motivations: ${profile.psychographics.motivations.join(", ")}
- Keywords: ${profile.keywords.join(", ")}

## Content Pillars (rotate the seeds across these)
${contentPillars.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## Your Task
Produce exactly ${count} seeds. Mix types across "question", "poll", "challenge", and "hot_take". Each seed must be platform-native — re-read the Platform Tone above before writing every one.

Return a JSON object with this exact structure:
{
  "seeds": [
    {
      "type": "question" | "poll" | "challenge" | "hot_take",
      "text": "string - the seed itself, written in the platform's voice and ready to post",
      "follow_up": "string (optional) - a planned reply or branch to keep the thread alive",
      "best_time": "string (optional) - suggested posting window, e.g. 'Tuesday 9am ET'",
      "rationale": "string - which audience pain point or pillar this targets and why it will resonate on ${platform}"
    }
  ]
}

Requirements:
- Return EXACTLY ${count} seeds, no more, no less
- Use a mix of seed types (do not return ${count} of the same type)
- Each seed's "text" must read as if a real person on ${platform} wrote it
- "rationale" must reference at least one persona pain point, frustration, or content pillar
- Do not number the seeds in their text`;
}

export async function generateConversationSeeds(
  input: SeedInput
): Promise<SeedOutput & { modelUsed: string; tokensUsed: number }> {
  const count = input.count ?? DEFAULT_COUNT;
  const tone = PLATFORM_TONE[input.platform] ?? DEFAULT_TONE;
  const prompt = buildSeedPrompt({ ...input, count, tone });

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system:
        "You are a community-building expert who designs conversation starters that get real engagement. You understand each social platform's native voice and refuse to cross-post generic content. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = conversationSeedsOutputSchema.parse(parsed);

    return {
      seeds: validated.seeds,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}

export { PLATFORM_TONE };
