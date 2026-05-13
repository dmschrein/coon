import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RevenueCreate,
  RevenueEntry,
  RevenueUpdate,
  MRRSummary,
} from "@/lib/validations/revenue";

export type { RevenueEntry } from "@/lib/validations/revenue";

export function useRevenueList() {
  return useQuery<RevenueEntry[]>({
    queryKey: ["revenue"],
    queryFn: async () => {
      const res = await fetch("/api/revenue");
      if (!res.ok) throw new Error("Failed to fetch revenue entries");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as RevenueEntry[];
    },
  });
}

export function useMRRSummary() {
  return useQuery<MRRSummary>({
    queryKey: ["revenue", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/revenue/summary");
      if (!res.ok) throw new Error("Failed to fetch revenue summary");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as MRRSummary;
    },
  });
}

export function useCreateRevenueEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RevenueCreate) => {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to create revenue entry"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as RevenueEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
    },
  });
}

export function useUpdateRevenueEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RevenueUpdate }) => {
      const res = await fetch(`/api/revenue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to update revenue entry"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as RevenueEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
    },
  });
}

export function useDeleteRevenueEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/revenue/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to delete revenue entry"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
    },
  });
}
