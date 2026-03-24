import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentApprovalStatus } from "@/types";

export function useBulkUpdateApproval(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      contentIds: string[];
      approvalStatus: ContentApprovalStatus;
    }) => {
      const res = await fetch(`/api/campaign/${campaignId}/content/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to bulk update");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, "content"],
      });
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}

export function useCohesionCheck(campaignId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/cohesion`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to check cohesion");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}
