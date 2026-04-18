import { anthropic } from "@/lib/claude";
import { blogContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  BlogContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Write a full SEO-optimized blog post for this marketing campaign.

## Campaign Context
- Campaign: ${strategy.campaignName}
- Theme: ${strategy.theme}
- Goal: ${strategy.goal}
- Core Message: ${strategy.messagingFramework.coreMessage}
- Tone: ${strategy.messagingFramework.toneGuidelines}
- Key Phrases to Use: ${strategy.messagingFramework.keyPhrases.join(", ")}
- Phrases to Avoid: ${strategy.messagingFramework.avoidPhrases.join(", ")}

## Content Pillars
${strategy.contentPillars.map((p) => `- ${p.theme}: ${p.description} (Topics: ${p.sampleTopics.join(", ")})`).join("\n")}

## Audience Context
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Pain Points: ${profile.psychographics.frustrations.join(", ")}
- Goals: ${profile.psychographics.goals.join(", ")}
- Keywords They Use: ${profile.keywords.join(", ")}
- Job Titles: ${profile.demographics.jobTitles.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Primary Goal: ${quiz.primaryGoal}

## Blog Post Requirements
- Length: 1500-2500 words
- Include H2 and H3 headers for structure
- Naturally incorporate target keywords (not stuffed)
- Meta description under 160 characters
- Include a compelling CTA at the end
- Write for humans first, search engines second
- Open with a hook that addresses the audience's primary pain point
- Include practical, actionable advice

Generate a JSON object:
{
  "title": "string - SEO-friendly title (50-60 chars ideal)",
  "metaDescription": "string - compelling meta description under 160 chars",
  "keywords": ["string - 5-10 target keywords"],
  "headers": [
    { "level": 2, "text": "string - H2 header" },
    { "level": 3, "text": "string - H3 subheader" }
  ],
  "bodyMarkdown": "string - the full blog post in markdown format with headers, paragraphs, lists, bold text etc.",
  "internalLinkingSuggestions": ["string - topics/pages this post should link to"],
  "cta": "string - the closing call to action",
  "estimatedReadTime": "string - e.g., '7 min read'"
}`;
}

export async function generateBlogContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: BlogContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system:
        "You are an expert SEO content writer and blog strategist. You write long-form content that ranks well and genuinely helps readers. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = blogContentSchema.parse(parsed);

    return {
      content: validated as BlogContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
