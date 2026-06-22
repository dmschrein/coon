/**
 * Assembles a ReadinessInput from the user's monetization config + observable community stats.
 * Kept separate from the route so it can be unit-mocked.
 */

import { getContainer } from "@/lib/core/di/container";
import type { MonetizationConfig, ReadinessInput } from "@/types";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export async function buildReadinessInput(
  userId: string,
  config: MonetizationConfig
): Promise<ReadinessInput> {
  const { platformMemberRepo } = getContainer();
  const members = await platformMemberRepo.getMembersByUserId(userId);

  const memberCount = members.length;
  const professionalMemberCount = members.filter((m) =>
    m.tags?.some((t) =>
      /professional|exec|manager|lead|engineer|designer/i.test(t)
    )
  ).length;

  const firstSeen = members
    .map((m) => m.firstSeenAt?.getTime?.() ?? Date.now())
    .reduce((min, t) => Math.min(min, t), Date.now());
  const weeksActive = Math.max(
    0,
    Math.floor((Date.now() - firstSeen) / MS_PER_WEEK)
  );

  const totalEngagement = members.reduce(
    (sum, m) => sum + (m.engagementCount ?? 0),
    0
  );
  const engagementRate =
    memberCount > 0 ? Math.min(1, totalEngagement / (memberCount * 10)) : 0;

  return {
    selectedModels: config.selectedModels,
    community: {
      memberCount,
      weeksActive,
      avgReachPerPost: memberCount,
      engagementRate,
      professionalMemberCount,
      nicheDefined: config.selectedModels.length > 0,
      transformationClarity: "vague",
    },
  };
}
