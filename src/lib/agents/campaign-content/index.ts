import type {
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
  CampaignPlatform,
} from "@/types";
import { generateBlogContent } from "./blog";
import { generateInstagramContent } from "./instagram";
import { generateTikTokContent } from "./tiktok";
import { generateTwitterContent } from "./twitter";
import { generatePinterestContent } from "./pinterest";
import { generateYouTubeContent } from "./youtube";
import { generateLinkedInContent } from "./linkedin";
import { generateRedditContent } from "./reddit";
import { generateDiscordContent } from "./discord";
import { generateThreadsContent } from "./threads";
import { generateEmailContent } from "./email";

// Maps platform to its generator function
const platformGenerators: Record<
  CampaignPlatform,
  (
    strategy: CampaignStrategy,
    profile: AudienceProfile,
    quiz: QuizResponse
  ) => Promise<{ content: unknown; tokensUsed: number }>
> = {
  blog: generateBlogContent,
  instagram: generateInstagramContent,
  tiktok: generateTikTokContent,
  twitter: generateTwitterContent,
  pinterest: generatePinterestContent,
  youtube: generateYouTubeContent,
  linkedin: generateLinkedInContent,
  reddit: generateRedditContent,
  discord: generateDiscordContent,
  threads: generateThreadsContent,
  email: generateEmailContent,
};

// Platforms grouped by generation cost (time/tokens)
const HEAVY_PLATFORMS: CampaignPlatform[] = ["blog", "youtube"];
const MEDIUM_PLATFORMS: CampaignPlatform[] = [
  "email",
  "linkedin",
  "tiktok",
  "twitter",
  "instagram",
  "reddit",
];
const LIGHT_PLATFORMS: CampaignPlatform[] = [
  "pinterest",
  "discord",
  "threads",
];

/**
 * Determines the next batch of platforms to generate content for.
 * Never pairs two heavy platforms together. Aims for 2-3 per batch.
 */
export function getNextBatch(
  pendingPlatforms: CampaignPlatform[]
): CampaignPlatform[] {
  if (pendingPlatforms.length === 0) return [];
  if (pendingPlatforms.length <= 2) return pendingPlatforms;

  const heavyPending = pendingPlatforms.filter((p) =>
    HEAVY_PLATFORMS.includes(p)
  );
  const mediumPending = pendingPlatforms.filter((p) =>
    MEDIUM_PLATFORMS.includes(p)
  );
  const lightPending = pendingPlatforms.filter((p) =>
    LIGHT_PLATFORMS.includes(p)
  );

  // If there's a heavy platform pending, pair it with one light platform
  if (heavyPending.length > 0) {
    const batch: CampaignPlatform[] = [heavyPending[0]];
    if (lightPending.length > 0) {
      batch.push(lightPending[0]);
    } else if (mediumPending.length > 0) {
      batch.push(mediumPending[0]);
    }
    return batch;
  }

  // Otherwise, pair two medium or up to three light
  if (mediumPending.length >= 2) {
    return mediumPending.slice(0, 2);
  }

  if (mediumPending.length === 1) {
    const batch: CampaignPlatform[] = [mediumPending[0]];
    if (lightPending.length > 0) {
      batch.push(lightPending[0]);
    }
    return batch;
  }

  // All light
  return lightPending.slice(0, 3);
}

export interface BatchResult {
  platform: CampaignPlatform;
  content: unknown;
  tokensUsed: number;
}

export interface BatchError {
  platform: CampaignPlatform;
  error: string;
}

/**
 * Generates content for a batch of platforms in parallel.
 * Uses Promise.allSettled for failure isolation.
 */
export async function generatePlatformBatch(
  platforms: CampaignPlatform[],
  strategy: CampaignStrategy,
  profile: AudienceProfile,
  quiz: QuizResponse
): Promise<{
  results: BatchResult[];
  errors: BatchError[];
}> {
  const promises = platforms.map(async (platform) => {
    const generator = platformGenerators[platform];
    const result = await generator(strategy, profile, quiz);
    return { platform, ...result };
  });

  const settled = await Promise.allSettled(promises);

  const results: BatchResult[] = [];
  const errors: BatchError[] = [];

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const platform = platforms[i];

    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      errors.push({
        platform,
        error:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason),
      });
    }
  }

  return { results, errors };
}
