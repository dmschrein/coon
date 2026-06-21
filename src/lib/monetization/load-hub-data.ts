import { getContainer } from "@/lib/core/di/container";
import type { MonetizationHubData } from "@/hooks/use-monetization-hub";

export async function loadMonetizationHubData(
  userId: string
): Promise<MonetizationHubData> {
  const {
    monetizationConfigRepo,
    monetizationReadinessRepo,
    revenueRepo,
    sponsorRepo,
    tierRepo,
  } = getContainer();

  const [config, cacheResult, mrr, pipelineValue, tiers] = await Promise.all([
    monetizationConfigRepo.getConfig(userId),
    monetizationReadinessRepo.getCache(userId),
    revenueRepo.getMRRSummary(userId),
    sponsorRepo.getPipelineValue(userId),
    tierRepo.listTiers(userId),
  ]);

  return {
    config,
    readiness: cacheResult.cache,
    revenueThisMonth: mrr.thisMonth,
    pipelineValue,
    activeTierCount: tiers.filter((t) => t.isActive).length,
  };
}
