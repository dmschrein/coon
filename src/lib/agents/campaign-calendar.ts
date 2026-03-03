import { anthropic } from "@/lib/claude";
import { campaignCalendarSchema } from "@/lib/validations/campaign";
import { extractJSON, withRetry } from "./utils";
import type {
  AudienceProfile,
  CampaignStrategy,
  CampaignCalendar,
} from "@/types";

const MODEL = "claude-sonnet-4-20250514";

function buildCalendarPrompt(
  strategy: CampaignStrategy,
  profile: AudienceProfile
): string {
  return `Create a detailed posting schedule for this marketing campaign.

## Campaign Strategy
- Name: ${strategy.campaignName}
- Theme: ${strategy.theme}
- Goal: ${strategy.goal}
- Target Outcome: ${strategy.targetOutcome}
- Timeline: ${strategy.timelineWeeks} weeks
- Core Message: ${strategy.messagingFramework.coreMessage}
- Tone: ${strategy.messagingFramework.toneGuidelines}

## Platform Allocations
${strategy.platformAllocations
  .map(
    (p) =>
      `- ${p.platform} (Priority ${p.priorityOrder}): ${p.role} | Focus: ${p.contentFocus} | Frequency: ${p.frequencySuggestion}`
  )
  .join("\n")}

## Content Pillars
${strategy.contentPillars
  .map((p) => `- ${p.theme}: ${p.description} (Pain point: ${p.targetedPainPoint})`)
  .join("\n")}

## Audience Context
- Content they consume: ${profile.behavioralPatterns.contentConsumption.join(", ")}
- Peak engagement patterns: Consider typical engagement times for ${profile.demographics.locations.join(", ")} audiences

## Your Task
Create a day-by-day posting schedule for the full ${strategy.timelineWeeks}-week campaign. Think about:
1. Cross-platform storytelling sequence (e.g., blog post Monday -> Twitter thread Tuesday -> Instagram carousel Wednesday)
2. Building momentum over the campaign timeline
3. Weekday vs weekend posting patterns
4. Distributing content pillars evenly across the timeline
5. Front-loading high-priority platforms

Generate a JSON object:
{
  "startDate": "Week 1, Day 1",
  "endDate": "Week ${strategy.timelineWeeks}, Day 7",
  "totalPosts": number,
  "entries": [
    {
      "dayNumber": 1,
      "platform": "string - platform name",
      "contentType": "string - e.g., 'blog post', 'carousel', 'thread', 'video script', 'pin'",
      "title": "string - brief description of what to post",
      "postingTime": "string - e.g., '9:00 AM EST'",
      "pillar": "string - which content pillar this belongs to",
      "notes": "string - optional cross-platform tie-ins or sequencing notes"
    }
  ],
  "weeklyOverview": [
    {
      "week": 1,
      "focus": "string - what this week focuses on in the campaign arc",
      "platforms": ["string - platforms active this week"]
    }
  ]
}

Requirements:
- Respect each platform's frequency suggestion from the allocations
- Include posting times optimized for the target audience locations
- Ensure every content pillar appears at least once per week
- The entries array should be sorted by dayNumber
- Total posts should match the sum of entries
- Each week should have a clear focus in the weekly overview
- Include notes for entries that connect to other platform posts`;
}

export async function generateCampaignCalendar(
  strategy: CampaignStrategy,
  profile: AudienceProfile
): Promise<{
  calendar: CampaignCalendar;
  modelUsed: string;
  tokensUsed: number;
}> {
  const prompt = buildCalendarPrompt(strategy, profile);

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system:
        "You are a social media scheduling expert who designs high-engagement posting calendars. You understand platform-specific optimal posting times and cross-platform content sequencing. Respond with valid JSON only. No markdown, no explanation.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(text);
    const validated = campaignCalendarSchema.parse(parsed);

    return {
      calendar: validated as CampaignCalendar,
      modelUsed: MODEL,
      tokensUsed:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };
  });
}
