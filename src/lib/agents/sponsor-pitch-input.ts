/**
 * Sponsor-pitch input assembly: pulls audience metrics from platform-member
 * data. Lives outside `sponsor-pitch.ts` because it needs the DI container,
 * and the agent itself must stay pure (no Next/db/Clerk imports).
 */

import { getContainer } from "@/lib/core/di/container";
import type { PitchInput } from "./sponsor-pitch";

const ENGAGEMENT_RATE_CEILING = 1;
const ENGAGEMENT_PER_MEMBER_DENOMINATOR = 10;
const MAX_PRIMARY_PLATFORMS = 3;

export async function buildPitchAudienceMetrics(
  userId: string
): Promise<PitchInput["audienceMetrics"]> {
  const { platformMemberRepo } = getContainer();
  const members = await platformMemberRepo.getMembersByUserId(userId);
  const memberCount = members.length;

  const totalEngagement = members.reduce(
    (sum, m) => sum + (m.engagementCount ?? 0),
    0
  );
  const engagementRate =
    memberCount > 0
      ? Math.min(
          ENGAGEMENT_RATE_CEILING,
          totalEngagement / (memberCount * ENGAGEMENT_PER_MEMBER_DENOMINATOR)
        )
      : 0;

  const primaryPlatforms = Array.from(
    new Set(members.map((m) => m.platform))
  ).slice(0, MAX_PRIMARY_PLATFORMS);

  return { memberCount, engagementRate, primaryPlatforms };
}
