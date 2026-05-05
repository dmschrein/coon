import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RitualRecurrence } from "@/lib/core/repositories/interfaces";

export interface RitualTemplateClient {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  platform: string;
  promptTemplate: string;
  recurrence: RitualRecurrence;
  dayOfWeek: number | null;
  isActive: boolean;
  sourceTemplateId: string | null;
  createdAt: string;
}

interface RitualsListResponse {
  items: RitualTemplateClient[];
}

const RITUALS_QUERY_KEY = ["rituals"] as const;

export function useRituals(initialItems?: RitualTemplateClient[]) {
  return useQuery<RitualsListResponse>({
    queryKey: RITUALS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/rituals");
      if (!res.ok) throw new Error("Failed to fetch rituals");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    initialData: initialItems ? { items: initialItems } : undefined,
  });
}

export function useActivateRitual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      campaignId,
    }: {
      id: string;
      campaignId: string;
    }) => {
      const res = await fetch(`/api/rituals/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Failed to activate ritual");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RITUALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["campaign-calendar"] });
    },
  });
}

export function useDeactivateRitual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/rituals/${id}/deactivate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Failed to deactivate ritual");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RITUALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["campaign-calendar"] });
    },
  });
}
