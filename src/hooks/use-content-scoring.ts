/**
 * Content Scoring Hooks - React Query hooks for content quality scoring.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useScoreCampaign(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/score`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to score content");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as { total: number; succeeded: number; failed: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, "content"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId],
      });
    },
  });
}
