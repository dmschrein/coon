import { anthropic } from "@/lib/claude";
import { campaignStrategySchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "./utils";
import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  CampaignPlatform,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildStrategyPrompt(
  profile: AudienceProfile,
  quiz: QuizResponse,
  selectedPlatforms: CampaignPlatform[]
): string {
  return `Design a unified multi-platform marketing campaign for this brand.

## Audience Profile
- Personas: ${profile.primaryPersonas.map((p) => `${p.name}: ${p.description} (Pain points: ${p.painPoints.join(", ")}; Goals: ${p.goals.join(", ")})`).join("\n  ")}
- Psychographics:
  - Values: ${profile.psychographics.values.join(", ")}
  - Motivations: ${profile.psychographics.motivations.join(", ")}
  - Frustrations: ${profile.psychographics.frustrations.join(", ")}
  - Goals: ${profile.psychographics.goals.join(", ")}
- Demographics:
  - Age Range: ${profile.demographics.ageRange[0]}-${profile.demographics.ageRange[1]}
  - Locations: ${profile.demographics.locations.join(", ")}
  - Job Titles: ${profile.demographics.jobTitles.join(", ")}
- Behavioral Patterns:
  - Content They Consume: ${profile.behavioralPatterns.contentConsumption.join(", ")}
  - Purchase Drivers: ${profile.behavioralPatterns.purchaseDrivers.join(", ")}
  - Decision Making: ${profile.behavioralPatterns.decisionMakingProcess}
- Keywords: ${profile.keywords.join(", ")}

## Product Context
- Type: ${quiz.productType}
- Stage: ${quiz.currentStage}
- Elevator Pitch: ${quiz.elevatorPitch}
- Problem Solved: ${quiz.problemSolved}
- Business Model: ${quiz.businessModel}
- Primary Goal: ${quiz.primaryGoal}
- Launch Timeline: ${quiz.launchTimeline}
- Weekly Time Commitment: ${quiz.weeklyTimeCommitment} hours/week

## Selected Platforms
${selectedPlatforms.join(", ")}

## Your Task
Create a cohesive campaign strategy where all content across platforms tells a connected story driving toward a single goal. Think about:
1. What single campaign goal unifies everything?
2. What theme/narrative connects all content?
3. How does each platform uniquely contribute to the funnel?
4. What messaging angles resonate across platforms?

Generate a JSON object with this exact structure:
{
  "campaignName": "string - catchy, memorable campaign name",
  "theme": "string - the unifying narrative/concept that ties all content together",
  "goal": "string - the single primary goal of this campaign",
  "targetOutcome": "string - specific, measurable outcome expected",
  "timelineWeeks": number,
  "messagingFramework": {
    "coreMessage": "string - the one sentence everyone should remember",
    "supportingMessages": ["string - 3-5 supporting messages that reinforce the core"],
    "toneGuidelines": "string - how the brand should sound across all platforms",
    "keyPhrases": ["string - branded phrases and hooks to use consistently"],
    "avoidPhrases": ["string - words/phrases that undermine the brand"]
  },
  "platformAllocations": [
    {
      "platform": "string - one of the selected platforms",
      "role": "string - e.g., 'primary discovery', 'authority building', 'community engagement'",
      "contentFocus": "string - what this platform specifically contributes to the campaign",
      "frequencySuggestion": "string - e.g., '3x per week', 'daily', '2x per month'",
      "priorityOrder": number
    }
  ],
  "contentPillars": [
    {
      "theme": "string - short pillar name",
      "description": "string - what this pillar covers and why",
      "sampleTopics": ["string - 3-5 specific topic ideas"],
      "targetedPainPoint": "string - which audience frustration this addresses"
    }
  ],
  "audienceHooks": ["string - 5-7 attention-grabbing angles/hooks that work across platforms"]
}

Requirements:
- Include a platformAllocation for EVERY selected platform
- Define 3-5 content pillars that map to audience pain points
- The campaign timeline should be realistic (2-8 weeks based on the product stage)
- Priority order 1 = most important platform, ascending from there
- Make the campaign name memorable and shareable`;
}

export async function generateCampaignStrategy(
  profile: AudienceProfile,
  quiz: QuizResponse,
  selectedPlatforms: CampaignPlatform[]
): Promise<{
  strategy: CampaignStrategy;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildStrategyPrompt(profile, quiz, selectedPlatforms);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are a campaign strategist specializing in multi-platform marketing campaigns for startups and creators. You design cohesive campaigns where every piece of content serves the unified goal. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = campaignStrategySchema.parse(parsed);

    return {
      strategy: validated as CampaignStrategy,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
