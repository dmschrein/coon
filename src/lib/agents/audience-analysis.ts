import { anthropic } from "@/lib/claude";
import { audienceProfileSchema } from "@/lib/validations/audience";
import { extractJSON, withRetry } from "./utils";
import type { QuizResponse, AudienceProfile } from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(quiz: QuizResponse): string {
  return `You are an expert market researcher. Analyze the following product/business information and generate a detailed audience profile.

## Product Information
- Type: ${quiz.productType}
- Elevator Pitch: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Current Stage: ${quiz.currentStage}

## Target Customer
- Ideal Customer: ${quiz.idealCustomer}
- Industry/Niche: ${quiz.industryNiche.join(", ")}
- Business Model: ${quiz.businessModel}
- Budget Range: ${quiz.budgetRange}

## Goals
- Primary Goal: ${quiz.primaryGoal}
- Launch Timeline: ${quiz.launchTimeline}
- Weekly Time Commitment: ${quiz.weeklyTimeCommitment} hours/week
- Target Platforms: ${quiz.preferredPlatforms.join(", ")}
- Content Comfort: ${quiz.contentComfortLevel}

Based on this information, generate a JSON object with this exact structure:
{
  "primaryPersonas": [
    {
      "name": "string - a realistic name",
      "description": "string - 2-3 sentence description",
      "painPoints": ["string"],
      "goals": ["string"],
      "objections": ["string - potential objections to the product"],
      "messagingAngle": "string - how to speak to this persona"
    }
  ],
  "psychographics": {
    "values": ["string"],
    "motivations": ["string"],
    "frustrations": ["string"],
    "goals": ["string"]
  },
  "demographics": {
    "ageRange": [number, number],
    "locations": ["string"],
    "jobTitles": ["string"],
    "incomeRange": "string"
  },
  "behavioralPatterns": {
    "contentConsumption": ["string - types of content they engage with"],
    "purchaseDrivers": ["string"],
    "decisionMakingProcess": "string"
  },
  "keywords": ["string - 10-15 keywords this audience uses"],
  "hashtags": ["string - 10-15 relevant hashtags with # prefix"]
}

Generate 2-3 personas. Be specific and actionable. Avoid generic descriptions.`;
}

export async function analyzeAudience(
  quizData: QuizResponse
): Promise<{
  profile: AudienceProfile;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildPrompt(quizData);

  const result = await withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are an expert market researcher and audience strategist. You always respond with valid JSON matching the exact schema requested. No markdown, no explanation — only the JSON object.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = audienceProfileSchema.parse(parsed);

    return {
      profile: validated as AudienceProfile,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });

  return result;
}
