import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContentApprovalStatus, CohesionCheckResult } from "@/types";

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

export function useCohesionQuery(campaignId: string) {
  return useQuery<{
    result: CohesionCheckResult | null;
    contentHash: string;
    cached: boolean;
  }>({
    queryKey: ["campaign", campaignId, "cohesion"],
    queryFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/cohesion`);
      if (!res.ok) throw new Error("Failed to fetch cohesion");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!campaignId,
  });
}

export function useCohesionCheck(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation<{
    result: CohesionCheckResult;
    contentHash: string;
    cached: boolean;
  }>({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/cohesion`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to check cohesion");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, "cohesion"],
      });
    },
  });
}

export function useDeleteContent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const res = await fetch(
        `/api/campaign/${campaignId}/content/${contentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete content");
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

export function useRegenerateContent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const res = await fetch(
        `/api/campaign/${campaignId}/content/${contentId}/regenerate`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to regenerate content");
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

export function useBulkSchedule(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      contentIds: string[];
      scheduledFor: string;
    }) => {
      const res = await fetch(`/api/campaign/${campaignId}/content/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule", ...input }),
      });
      if (!res.ok) throw new Error("Failed to bulk schedule");
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

export function useBulkRegenerate(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentIds: string[]) => {
      const res = await fetch(`/api/campaign/${campaignId}/content/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate", contentIds }),
      });
      if (!res.ok) throw new Error("Failed to bulk regenerate");
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
