/**
 * Media Hooks - React Query hooks for image generation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useGenerateMedia(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/media`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to generate media");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
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

export function useGenerateContentMedia(campaignId: string, contentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/campaign/${campaignId}/content/${contentId}/media`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message ?? "Failed to generate media");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, "content"],
      });
    },
  });
}
