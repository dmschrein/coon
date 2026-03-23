import { anthropic } from "@/lib/claude";
import { twitterContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  TwitterContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create X/Twitter content for this marketing campaign.

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
- Keywords: ${profile.keywords.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Primary Goal: ${quiz.primaryGoal}

## X/Twitter-Specific Requirements
- Individual tweets: max 280 characters each
- Thread: 5-8 tweets that build on each other, each providing standalone value
- First tweet of thread must hook — it determines whether people read the rest
- Quote tweet suggestions: provide tweets that would make someone want to quote-tweet with their own take
- Reply hooks: conversation starters that invite replies
- Mix of formats: hot takes, stories, tips, questions
- Sound like a knowledgeable peer, not a brand

Generate a JSON object:
{
  "tweets": ["string - 3-5 standalone tweets, each under 280 chars"],
  "threadSeparated": ["string - a 5-8 tweet thread, each tweet as a separate array element, each under 280 chars"],
  "quoteTweetSuggestions": ["string - 2-3 tweets designed to be quote-tweeted"],
  "replyHooks": ["string - 2-3 tweets that invite replies/discussion"],
  "hashtags": ["string - 3-5 relevant hashtags"]
}`;
}

export async function generateTwitterContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: TwitterContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an X/Twitter growth strategist who crafts viral tweets and engaging threads. You understand what makes content get impressions, replies, and retweets. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = twitterContentSchema.parse(parsed);

    return {
      content: validated as TwitterContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
