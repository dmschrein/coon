/**
 * Loads the derived community hub state for a user. Shared by the hub API route
 * and the hub server component so both agree on how each gate is computed.
 *
 * Note: onboarding "active" is the source-of-truth flag on the user's onboarding
 * sequence (set when the sequence is activated), falling back to the legacy
 * community_config.onboardingActive flag.
 */

import { getContainer } from "@/lib/core/di/container";
import type { CommunityHubData } from "@/types";

export async function loadCommunityHubData(
  userId: string
): Promise<CommunityHubData> {
  const { communityConfigRepo, platformMemberRepo, onboardingRepo } =
    getContainer();

  const [config, members, sequence] = await Promise.all([
    communityConfigRepo.getConfig(userId),
    platformMemberRepo.listMembers(userId, { page: 1, limit: 1 }),
    onboardingRepo.getSequence(userId),
  ]);

  const setupGuides = config?.setupGuides ?? {};
  const completedSetupGuides = Object.keys(setupGuides).filter(
    (platform) => setupGuides[platform]?.completed
  );

  return {
    hasManifesto: Boolean(config?.manifesto),
    completedSetupGuides,
    hasRules: (config?.rules?.length ?? 0) > 0,
    hasActiveOnboarding:
      Boolean(sequence?.isActive) || config?.onboardingActive === true,
    memberCount: members.total,
  };
}
