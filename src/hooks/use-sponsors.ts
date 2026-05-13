import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Sponsor,
  SponsorCreate,
  SponsorStatus,
  SponsorUpdate,
} from "@/lib/validations/sponsor";

export type { Sponsor } from "@/lib/validations/sponsor";

export interface SponsorFilters {
  status?: SponsorStatus;
}

interface DraftPitchResponse {
  subject: string;
  body: string;
  followUp: string;
  modelUsed: string;
  tokensUsed: number;
}

export function useSponsorsList(filters: SponsorFilters = {}) {
  return useQuery<Sponsor[]>({
    queryKey: ["sponsors", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      const qs = params.toString();
      const res = await fetch(`/api/sponsors${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch sponsors");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Sponsor[];
    },
  });
}

export function useSponsor(id: string) {
  return useQuery<Sponsor>({
    queryKey: ["sponsor", id],
    queryFn: async () => {
      const res = await fetch(`/api/sponsors/${id}`);
      if (!res.ok) throw new Error("Failed to fetch sponsor");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SponsorCreate) => {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to create sponsor");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Sponsor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsors"] });
    },
  });
}

export function useUpdateSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SponsorUpdate }) => {
      const res = await fetch(`/api/sponsors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to update sponsor");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Sponsor;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["sponsors"] });
      await queryClient.cancelQueries({ queryKey: ["sponsor", id] });

      const previousLists = queryClient.getQueriesData<Sponsor[]>({
        queryKey: ["sponsors"],
      });
      const previousItem = queryClient.getQueryData<Sponsor>(["sponsor", id]);

      queryClient.setQueriesData<Sponsor[]>(
        { queryKey: ["sponsors"] },
        (old) => {
          if (!old) return old;
          return old.map((s) =>
            s.id === id ? ({ ...s, ...patch } as Sponsor) : s
          );
        }
      );

      if (previousItem) {
        queryClient.setQueryData<Sponsor>(["sponsor", id], {
          ...previousItem,
          ...patch,
        } as Sponsor);
      }

      return { previousLists, previousItem };
    },
    onError: (_err, vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousItem) {
        queryClient.setQueryData(["sponsor", vars.id], context.previousItem);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sponsors"] });
      queryClient.invalidateQueries({ queryKey: ["sponsor", vars.id] });
    },
  });
}

export function useDeleteSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to delete sponsor");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sponsors"] });
    },
  });
}

export function useDraftSponsorPitch() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sponsors/${id}/draft-pitch`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to draft sponsor pitch"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as DraftPitchResponse;
    },
  });
}
