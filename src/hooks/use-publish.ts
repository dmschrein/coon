/**
 * Publish Hooks - React Query hooks for content publishing.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublishResult } from "@/types";

export interface PublishContentVariables {
  contentId: string;
  /** Pinterest board selected for this pin. */
  boardId?: string;
}

export function usePublishContent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation<PublishResult, Error, PublishContentVariables>({
    mutationFn: async ({ contentId, boardId }: PublishContentVariables) => {
      const res = await fetch(
        `/api/campaign/${campaignId}/publish/${contentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardId }),
        }
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
