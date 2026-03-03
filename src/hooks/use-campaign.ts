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
    mutationFn: async (selectedPlatforms: string[]) => {
      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPlatforms }),
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
