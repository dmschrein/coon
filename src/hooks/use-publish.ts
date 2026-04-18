/**
 * Publish Hooks - React Query hooks for content publishing.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublishResult } from "@/types";

export function usePublishContent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation<PublishResult, Error, string>({
    mutationFn: async (contentId: string) => {
      const res = await fetch(
        `/api/campaign/${campaignId}/publish/${contentId}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to publish");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}
