import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  MembershipTier,
  TierCreate,
  TierUpdate,
} from "@/lib/validations/tier";

export type { MembershipTier } from "@/lib/validations/tier";

interface GenerateCopyResponse {
  name: string;
  tagline: string;
  description: string;
  benefits: string[];
}

interface GenerateCopyInput {
  audienceSummary: string;
  communityName: string;
  priceCents: number;
  billingCycle: "monthly" | "yearly" | "one_time";
  tierGoal: string;
}

export function useTiersList() {
  return useQuery<MembershipTier[]>({
    queryKey: ["tiers"],
    queryFn: async () => {
      const res = await fetch("/api/tiers");
      if (!res.ok) throw new Error("Failed to fetch tiers");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as MembershipTier[];
    },
  });
}

export function useCreateTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TierCreate) => {
      const res = await fetch("/api/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to create tier");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as MembershipTier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
    },
  });
}

export function useUpdateTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TierUpdate }) => {
      const res = await fetch(`/api/tiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to update tier");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as MembershipTier;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["tiers"] });
      const previous = queryClient.getQueryData<MembershipTier[]>(["tiers"]);

      queryClient.setQueryData<MembershipTier[]>(["tiers"], (old) => {
        if (!old) return old;
        return old.map((t) =>
          t.id === id ? ({ ...t, ...patch } as MembershipTier) : t
        );
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tiers"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
    },
  });
}

export function useDeleteTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tiers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to delete tier");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
    },
  });
}

export function useReorderTiers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch("/api/tiers/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to reorder tiers");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as { orderedIds: string[] };
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["tiers"] });
      const previous = queryClient.getQueryData<MembershipTier[]>(["tiers"]);

      queryClient.setQueryData<MembershipTier[]>(["tiers"], (old) => {
        if (!old) return old;
        const byId = new Map(old.map((t) => [t.id, t]));
        return orderedIds
          .map((id, i) => {
            const t = byId.get(id);
            return t ? { ...t, sortOrder: i } : null;
          })
          .filter((t): t is MembershipTier => t !== null);
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tiers"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
    },
  });
}

export function useGenerateTierCopy() {
  return useMutation({
    mutationFn: async (input: GenerateCopyInput) => {
      const res = await fetch("/api/tiers/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to generate copy");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as GenerateCopyResponse;
    },
  });
}
