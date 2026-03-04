import { anthropic } from "@/lib/claude";
import { threadsContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  ThreadsContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create Threads content for this marketing campaign.

## Campaign Context
- Campaign: ${strategy.campaignName}
- Theme: ${strategy.theme}
- Goal: ${strategy.goal}
- Core Message: ${strategy.messagingFramework.coreMessage}
- Tone: ${strategy.messagingFramework.toneGuidelines}

## Content Pillars
${strategy.contentPillars.map((p) => `- ${p.theme}: ${p.description}`).join("\n")}

## Audience Context
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Pain Points: ${profile.psychographics.frustrations.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}

## Threads-Specific Requirements
- Post text: max 500 characters
- Threads rewards conversational, opinion-driven content
- Think "hot take" meets "genuine insight"
- Conversation starters should invite replies naturally
- Reply strategy: plan how to keep the conversation going when people respond
- Casual, authentic tone — Threads is more personal than Twitter

Generate a JSON object:
{
  "postText": "string - main post under 500 characters, conversational and engaging",
  "conversationStarters": ["string - 3-4 follow-up posts or reply-bait variations"],
  "replyStrategy": ["string - 2-3 planned replies for common responses to keep engagement going"]
}`;
}

export async function generateThreadsContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: ThreadsContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a Threads content creator who writes engaging, conversational posts that drive replies and shares. You understand what makes content go viral in conversation-first social platforms. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = threadsContentSchema.parse(parsed);

    return {
      content: validated as ThreadsContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
