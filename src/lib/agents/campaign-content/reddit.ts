import { anthropic } from "@/lib/claude";
import { redditContentSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "../utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  RedditContent,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Create Reddit content for this marketing campaign.

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
- Keywords: ${profile.keywords.join(", ")}
- Industry: ${quiz.industryNiche.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Unique Angle: ${quiz.uniqueAngle}
- Differentiators: ${quiz.differentiators.join(", ")}

## Reddit-Specific Requirements
- NEVER be self-promotional — Reddit users will downvote obvious marketing
- Provide genuine value first: share knowledge, tell a story, ask a real question
- Match subreddit culture — different subs have different norms
- Title should be compelling but not clickbaity
- Body should be authentic, helpful, and read like a real person sharing experience
- Comment engagement: prepare thoughtful follow-up comments for when people respond
- Suggest specific subreddits that match the audience (real subreddits)

Generate a JSON object:
{
  "postTitle": "string - compelling, authentic post title",
  "postBody": "string - the full post body, helpful and value-first (never promotional), formatted with Reddit markdown",
  "suggestedSubreddits": ["string - 3-5 specific subreddit names (e.g., 'r/startups', 'r/SaaS') that match the audience"],
  "commentEngagementStrategy": ["string - 3-4 prepared follow-up comments for likely responses/questions"],
  "flairSuggestion": "string - suggested post flair if applicable"
}`;
}

export async function generateRedditContent(
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ content: RedditContent; tokensUsed: number }> {
  const prompt = buildPrompt(strategy, profile, quiz);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a Reddit community expert who understands how to share valuable content without triggering spam detection or community backlash. You write like a genuine community member sharing helpful knowledge. Respond with valid JSON only. No markdown wrapping, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = redditContentSchema.parse(parsed);

    return {
      content: validated as RedditContent,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
