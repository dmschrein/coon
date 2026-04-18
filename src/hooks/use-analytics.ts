/**
 * Analytics Hooks - React Query hooks for campaign analytics.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CampaignAnalyticsData } from "@/types";

export function useCampaignAnalytics(campaignId: string) {
  return useQuery<CampaignAnalyticsData | null>({
    queryKey: ["campaign-analytics", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!campaignId,
  });
}

export function useGenerateInsights(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation<CampaignAnalyticsData, Error>({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/analytics`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to generate insights");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaign-analytics", campaignId],
      });
    },
  });
}
