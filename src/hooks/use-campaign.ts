import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useCampaignList() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaign");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaign/${id}`);
      if (!res.ok) throw new Error("Failed to fetch campaign");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input:
        | { selectedPlatforms: string[] }
        | {
            name: string;
            goal: string;
            topic: string;
            platforms: string[];
            duration: string;
            frequencyConfig: Record<string, number>;
          }
    ) => {
      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useGeneratePlan(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/plan`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate campaign plan");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}

export function useCampaignContent(campaignId: string) {
  return useQuery({
    queryKey: ["campaign", campaignId, "content"],
    queryFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}`);
      if (!res.ok) throw new Error("Failed to fetch campaign content");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data.content;
    },
    enabled: !!campaignId,
  });
}

export function useUpdateContent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      ...updates
    }: {
      contentId: string;
      approvalStatus?: string;
      body?: string;
    }) => {
      const res = await fetch(
        `/api/campaign/${campaignId}/content/${contentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
      if (!res.ok) throw new Error("Failed to update content");
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

export function useGenerateCalendar(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/calendar`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate calendar");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}

export function useGenerateNextBatch(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaign/${campaignId}/generate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate content batch");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
  });
}

export function useUpdateCampaign(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/campaign/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await fetch(`/api/campaign/${campaignId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete campaign");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
