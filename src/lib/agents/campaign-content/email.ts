import { anthropic } from "@/lib/claude";
import { emailNewsletterContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  EmailNewsletterContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create an email newsletter brief for this marketing campaign.

## Campaign Context
- Campaign: ${strategy.campaignName}
- Theme: ${strategy.theme}
- Goal: ${strategy.goal}
- Core Message: ${strategy.messagingFramework.coreMessage}
- Tone: ${strategy.messagingFramework.toneGuidelines}
- Key Phrases: ${strategy.messagingFramework.keyPhrases.join(", ")}

## Content Pillars
${strategy.contentPillars.map((p) => `- ${p.theme}: ${p.description}`).join("\n")}

## Audience Context
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Pain Points: ${profile.psychographics.frustrations.join(", ")}
- Motivations: ${profile.psychographics.motivations.join(", ")}
- Purchase Drivers: ${profile.behavioralPatterns.purchaseDrivers.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Unique Angle: ${quiz.uniqueAngle}
- Differentiators: ${quiz.differentiators.join(", ")}

## Email Newsletter Requirements
- Subject line: under 50 chars, high open-rate hook (curiosity, urgency, or value)
- Preview text: the snippet that shows in inbox next to subject line (under 100 chars)
- Body sections: 3-5 clear sections with headings (scannable, not walls of text)
- CTAs: 1-2 clear action buttons with context on what happens when clicked
- Segmentation suggestions: who should receive this and any personalization opportunities
- Write in second person ("you") for personal connection
- First section should hook immediately — most people decide to read or delete in 3 seconds

Generate a JSON object:
{
  "subjectLine": "string - email subject line under 50 chars",
  "previewText": "string - inbox preview text under 100 chars",
  "bodySections": [
    {
      "heading": "string - section heading",
      "content": "string - section content in plain text with formatting notes"
    }
  ],
  "ctaButtons": [
    {
      "text": "string - button text (e.g., 'Get Early Access', 'Read the Full Story')",
      "description": "string - where the button leads and why someone should click"
    }
  ],
  "segmentationSuggestions": ["string - audience segments and personalization opportunities"]
}`;
}

export async function generateEmailContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: EmailNewsletterContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an email marketing specialist who writes newsletters with high open rates and click-through rates. You understand inbox psychology and what makes people read vs. delete. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = emailNewsletterContentSchema.parse(parsed);

    return {
      content: validated as EmailNewsletterContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
