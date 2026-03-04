import { anthropic } from "@/lib/claude";
import {
  contentStrategySchema,
  generatedContentSchema,
} from "@/lib/validations/content";
import { extractJSON, withRetry } from "./utils";
import type {
  AudienceProfile,
  QuizResponse,
  ContentStrategy,
  GeneratedContent,
} from "@/types";
import { z } from "zod";

const MODEL_STRATEGY = "claude-sonnet-4-20250514";
const MODEL_DRAFTS = "claude-sonnet-4-20250514";

function getContentCount(platforms: string[]): number {
  if (platforms.length <= 2) return 10;
  if (platforms.length <= 4) return 15;
  return 20;
}

function buildStrategyPrompt(
  profile: AudienceProfile,
  quiz: QuizResponse
): string {
  return `Based on this audience profile, define a content strategy.

## Audience Profile
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Key Pain Points: ${profile.psychographics.frustrations.join(", ")}
- Motivations: ${profile.psychographics.motivations.join(", ")}
- Content they consume: ${profile.behavioralPatterns.contentConsumption.join(", ")}
- Keywords: ${profile.keywords.join(", ")}

## Product Context
- Product: ${quiz.elevatorPitch}
- Differentiators: ${quiz.differentiators.join(", ")}

## Constraints
- Target platforms: ${quiz.preferredPlatforms.join(", ")}
- Content comfort level: ${quiz.contentComfortLevel}
- Weekly time commitment: ${quiz.weeklyTimeCommitment} hours

Generate a JSON object:
{
  "pillars": [
    {
      "theme": "string - short theme name",
      "description": "string - what this pillar covers",
      "sampleTopics": ["string - 3-5 specific topic ideas"],
      "targetedPainPoint": "string - which audience pain point this addresses"
    }
  ],
  "voiceTone": "string - describe the ideal voice and tone for this brand",
  "contentMix": { "platform_name": percentage_number }
}

Define 3-5 content pillars. Each pillar should map to a specific audience pain point or motivation. The contentMix percentages should add up to 100 and be distributed across the selected platforms.`;
}

function buildDraftsPrompt(
  profile: AudienceProfile,
  strategy: ContentStrategy,
  platforms: string[],
  count: number
): string {
  return `Using this content strategy and audience profile, generate ${count} content pieces ready to post.

## Audience Profile
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description}`).join("; ")}
- Keywords: ${profile.keywords.join(", ")}
- Hashtags: ${profile.hashtags.join(", ")}

## Content Strategy
- Pillars: ${strategy.pillars.map((p) => `${p.theme}: ${p.description}`).join("; ")}
- Voice/Tone: ${strategy.voiceTone}
- Content Mix: ${JSON.stringify(strategy.contentMix)}

## Target Platforms
${platforms.join(", ")}

Generate a JSON array of ${count} content pieces:
[
  {
    "platform": "twitter|linkedin|reddit|discord|youtube|tiktok|instagram|threads|hackernews|producthunt|indiehackers",
    "contentType": "educational|story|question|poll|behind-the-scenes|tip|thread|comment|resource|case-study|meme|announcement",
    "pillar": "string - which content pillar this belongs to",
    "draft": {
      "headline": "string or null - optional headline",
      "body": "string - the full content ready to post",
      "hashtags": ["string"] or null,
      "cta": "string or null - optional call to action"
    }
  }
]

Rules:
- Twitter content: max 280 chars per tweet. For threads, separate tweets with \\n---\\n
- LinkedIn posts: 150-300 words, professional but conversational
- Reddit posts: authentic, helpful, never self-promotional, match subreddit culture
- Include a mix of content types across pillars
- Distribute across the selected platforms based on the content mix percentages
- Make each piece ready to copy and post as-is
- Sound like a helpful peer, not a marketer`;
}

async function generateStrategy(
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{ strategy: ContentStrategy; tokensUsed: number }> {
  console.log("🎯 Starting strategy generation...");
  const prompt = buildStrategyPrompt(profile, quiz);

  return withRetry(async () => {
    console.log("📡 Calling Anthropic API for strategy...");
    const response = await anthropic.messages.create({
      model: MODEL_STRATEGY,
      max_tokens: 2048,
      system:
        "You are a content strategist. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });
    console.log("✅ Strategy API call completed");

    console.log("📄 Extracting text from response...");
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    console.log("📄 Text extracted, length:", text.length);

    console.log("🔍 Parsing JSON from text...");
    const parsed = extractJSON(text);
    console.log("✔️ JSON parsed successfully");

    console.log("✅ Validating strategy schema...");
    const validated = contentStrategySchema.parse(parsed);
    console.log("✅ Strategy validated successfully");

    return {
      strategy: validated as ContentStrategy,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}

async function generateDrafts(
  profile: AudienceProfile,
  strategy: ContentStrategy,
  platforms: string[],
  count: number
): Promise<{ drafts: GeneratedContent[]; tokensUsed: number }> {
  console.log("📝 Starting drafts generation...");
  const prompt = buildDraftsPrompt(profile, strategy, platforms, count);

  return withRetry(async () => {
    console.log("📡 Calling Anthropic API for drafts...");
    const response = await anthropic.messages.create({
      model: MODEL_DRAFTS,
      max_tokens: 8192,
      system:
        "You are a content creator. Respond with a valid JSON array only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });
    console.log("✅ Drafts API call completed");

    console.log("📄 Extracting text from drafts response...");
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    console.log("📄 Text extracted, length:", text.length);

    console.log("🔍 Parsing JSON from drafts text...");
    const parsed = extractJSON(text);
    console.log("✔️ Drafts JSON parsed successfully");

    console.log("✅ Validating drafts schema...");
    const validated = z.array(generatedContentSchema).parse(parsed);
    console.log("✅ Drafts validated successfully, count:", validated.length);

    return {
      drafts: validated as GeneratedContent[],
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}

export async function generateContent(
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{
  strategy: ContentStrategy;
  drafts: GeneratedContent[];
  modelUsed: string;
  tokensUsed: number;
}> {
  console.log("🚀 Starting generateContent flow...");
  const count = getContentCount(quiz.preferredPlatforms);
  console.log(`📊 Will generate ${count} content pieces for platforms:`, quiz.preferredPlatforms);

  // Step 1: Generate strategy
  console.log("📋 Step 1: Generating strategy...");
  const strategyResult = await generateStrategy(profile, quiz);
  console.log("✅ Step 1 complete - Strategy generated");

  // Step 2: Generate drafts using the strategy
  console.log("📋 Step 2: Generating drafts...");
  const draftsResult = await generateDrafts(
    profile,
    strategyResult.strategy,
    quiz.preferredPlatforms,
    count
  );
  console.log("✅ Step 2 complete - Drafts generated");

  console.log("🎉 Content generation complete!");
  return {
    strategy: strategyResult.strategy,
    drafts: draftsResult.drafts,
    modelUsed: `${MODEL_STRATEGY} (strategy), ${MODEL_DRAFTS} (drafts)`,
    tokensUsed: strategyResult.tokensUsed + draftsResult.tokensUsed,
  };
}
