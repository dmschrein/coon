import { CLAUDE_MODEL } from "@/lib/model";
import { anthropic } from "@/lib/claude";
import {
  sponsorPitchOutputSchema,
  type SponsorPitchOutput,
} from "@/lib/validations/sponsor";
import type { AudienceProfile } from "@/types";
import { extractJSON, withRetry } from "./utils";

const MODEL = CLAUDE_MODEL;
const BODY_WORD_LIMIT = 300;

export interface PitchInput {
  sponsor: {
    companyName: string;
    contactName?: string | null;
    deliverables?: string | null;
  };
  product: { name: string; description: string };
  audienceProfile: AudienceProfile;
  audienceMetrics: {
    memberCount: number;
    engagementRate?: number;
    primaryPlatforms: string[];
  };
  communityName: string;
}

function summarizeAudience(profile: AudienceProfile): string {
  const persona = profile.primaryPersonas[0];
  const personaLine = persona
    ? `Primary persona: ${persona.name} — ${persona.description} Pain points: ${persona.painPoints.slice(0, 3).join("; ")}.`
    : "";
  const values = profile.psychographics?.values?.slice(0, 4).join(", ") ?? "";
  const keywords = profile.keywords?.slice(0, 6).join(", ") ?? "";
  return [
    personaLine,
    values && `Values: ${values}.`,
    keywords && `Keywords: ${keywords}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildPrompt(input: PitchInput): string {
  const audienceSummary = summarizeAudience(input.audienceProfile);
  const contactGreeting = input.sponsor.contactName
    ? `Greet the contact by first name (${input.sponsor.contactName}).`
    : "Open with a warm but non-cringe greeting (no 'Dear sir/madam').";
  const deliverablesLine = input.sponsor.deliverables
    ? `Deliverables on the table: ${input.sponsor.deliverables}.`
    : "Do not invent specific deliverables; speak to potential collaboration shape only.";
  const engagementLine =
    input.audienceMetrics.engagementRate !== undefined
      ? `Engagement rate: ${(input.audienceMetrics.engagementRate * 100).toFixed(1)}%.`
      : "";
  const platformsLine =
    input.audienceMetrics.primaryPlatforms.length > 0
      ? `Primary platforms: ${input.audienceMetrics.primaryPlatforms.join(", ")}.`
      : "";

  return `You are pitching a sponsorship for the community "${input.communityName}" to ${input.sponsor.companyName}.

## Community
- Name: ${input.communityName}
- Member count: ${input.audienceMetrics.memberCount}
${engagementLine}
${platformsLine}

## Audience Profile
${audienceSummary}

## Product behind the community
- Name: ${input.product.name}
- Description: ${input.product.description}

## Sponsor
- Company: ${input.sponsor.companyName}
${input.sponsor.contactName ? `- Contact: ${input.sponsor.contactName}` : ""}

## Instructions
Write a sponsorship pitch email tailored to ${input.sponsor.companyName}. Return three fields:
- "subject": a concise subject line (under 200 chars)
- "body": the pitch body — MUST be under ${BODY_WORD_LIMIT} words
- "followUp": a short, lower-pressure follow-up message to send 4 days later if there is no reply

Rules for the body:
- ${contactGreeting}
- The body MUST include the exact member count number "${input.audienceMetrics.memberCount}" verbatim to ground the value prop in real audience numbers.
- ${deliverablesLine}
- Lead with a specific, plausible reason ${input.sponsor.companyName} would care about this audience.
- Be concrete about the audience — reference the persona and keywords.
- No corporate filler. Sound like one human writing to another.
- Do NOT mention "Claude", "AI", "language model", or "automation".

Return a JSON object exactly in this shape:
{
  "subject": "string under 200 characters",
  "body": "string under ${BODY_WORD_LIMIT} words, including the literal number ${input.audienceMetrics.memberCount}",
  "followUp": "short follow-up message"
}`;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function truncateToWordLimit(s: string, max: number): string {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return s;
  return words.slice(0, max).join(" ");
}

export async function generateSponsorPitch(input: PitchInput): Promise<{
  result: SponsorPitchOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        "You are an expert sponsorship pitch writer. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = sponsorPitchOutputSchema.parse(parsed);

    const memberCountStr = String(input.audienceMetrics.memberCount);
    if (!validated.body.includes(memberCountStr)) {
      throw new Error(
        `Sponsor pitch body must include the audience member count (${memberCountStr})`
      );
    }

    const body =
      wordCount(validated.body) > BODY_WORD_LIMIT
        ? truncateToWordLimit(validated.body, BODY_WORD_LIMIT)
        : validated.body;

    return {
      result: {
        subject: validated.subject,
        body,
        followUp: validated.followUp,
      },
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
