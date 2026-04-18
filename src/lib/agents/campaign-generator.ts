import { anthropic } from "@/lib/claude";
import { extractJSON, withRetry } from "./utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignGoal,
  CampaignDuration,
  CampaignPlatform,
  CampaignGeneratorOutput,
  ContentPillar,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

interface CampaignGeneratorInput {
  profile: AudienceProfile;
  quiz: QuizResponse;
  name: string;
  goal: CampaignGoal;
  topic: string;
  platforms: CampaignPlatform[];
  duration: CampaignDuration;
  frequencyConfig: Record<string, number>;
}

function durationToWeeks(duration: CampaignDuration): number {
  const map: Record<CampaignDuration, number> = {
    "1-week": 1,
    "2-weeks": 2,
    "4-weeks": 4,
    "8-weeks": 8,
    "12-weeks": 12,
  };
  return map[duration];
}

function buildGeneratorPrompt(input: CampaignGeneratorInput): string {
  const {
    profile,
    quiz,
    name,
    goal,
    topic,
    platforms,
    duration,
    frequencyConfig,
  } = input;
  const weeks = durationToWeeks(duration);
  const totalDays = weeks * 7;

  const frequencyDesc = platforms
    .map((p) => `${p}: ${frequencyConfig[p] || 1}x/week`)
    .join(", ");

  return `Design a complete campaign plan for "${name}".

## Campaign Config
- Goal: ${goal}
- Topic: ${topic}
- Platforms: ${platforms.join(", ")}
- Duration: ${weeks} weeks (${totalDays} days)
- Posting frequency: ${frequencyDesc}

## Audience Profile
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description} (Pain points: ${p.painPoints.join(", ")})`).join("\n  ")}
- Values: ${profile.psychographics.values.join(", ")}
- Motivations: ${profile.psychographics.motivations.join(", ")}
- Keywords: ${profile.keywords.join(", ")}

## Product Context
- Type: ${quiz.productType}
- Stage: ${quiz.currentStage}
- Pitch: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Business Model: ${quiz.businessModel}
- Primary Goal: ${quiz.primaryGoal}

## Your Task
Generate a JSON object with this exact structure:
{
  "strategySummary": "string - 2-3 sentence overview of the campaign strategy",
  "contentPillars": [
    {
      "theme": "string - short pillar name",
      "description": "string - what this pillar covers",
      "sampleTopics": ["string - 3-5 topic ideas"],
      "targetedPainPoint": "string - audience pain point this addresses"
    }
  ],
  "contentPlan": [
    {
      "platform": "string - one of: ${platforms.join(", ")}",
      "contentType": "string - e.g. educational, story, question, tip, thread, resource",
      "pillar": "string - must match a contentPillars theme",
      "title": "string - working title for this piece",
      "scheduledDay": number (1 to ${totalDays})
    }
  ]
}

Requirements:
- Create 3-5 content pillars mapped to audience pain points
- The contentPlan must include exactly the right number of posts: respect the frequency config
  - Total posts = sum of (frequency per platform * ${weeks} weeks)
- Spread posts evenly across the ${totalDays} days
- Each content piece must reference a valid pillar theme
- Vary content types across the campaign
- Early days should focus on awareness, later on engagement/conversion`;
}

export async function generateCampaignPlan(
  input: CampaignGeneratorInput
): Promise<{
  output: CampaignGeneratorOutput;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildGeneratorPrompt(input);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system:
        "You are a campaign planner specializing in multi-platform content campaigns for startups and creators. You create detailed, actionable content plans. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text) as Record<string, unknown>;

    const output: CampaignGeneratorOutput = {
      strategySummary: parsed.strategySummary as string,
      contentPillars: parsed.contentPillars as ContentPillar[],
      contentPlan: parsed.contentPlan as CampaignGeneratorOutput["contentPlan"],
    };

    return {
      output,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
