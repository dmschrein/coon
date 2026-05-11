import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Partner,
  PartnerCreate,
  PartnerUpdate,
} from "@/lib/validations/partner";

export type { Partner } from "@/lib/validations/partner";

export function usePartnersList() {
  return useQuery<Partner[]>({
    queryKey: ["partners"],
    queryFn: async () => {
      const res = await fetch("/api/partners");
      if (!res.ok) throw new Error("Failed to fetch partners");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PartnerCreate) => {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to create partner");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Partner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PartnerUpdate }) => {
      const res = await fetch(`/api/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to update partner");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Partner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to delete partner");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
  });
}
