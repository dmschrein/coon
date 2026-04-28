/**
 * Engagement Hooks - React Query hooks for campaign engagement data.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface EngagementRecord {
  contentId: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  engagementRate: string | null;
  recordedAt: string;
}

export function useEngagement(campaignId: string) {
  return useQuery<EngagementRecord[]>({
    queryKey: ["campaign-engagement", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/engagement`);
      if (!res.ok) throw new Error("Failed to fetch engagement data");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data ?? [];
    },
    enabled: !!campaignId,
  });
}

export function useRefreshEngagement(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ queued: number }, Error>({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/engagement/fetch`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to refresh engagement");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaign-engagement", campaignId],
      });
    },
  });
}
