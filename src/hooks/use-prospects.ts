import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ProspectStatus,
  ProspectSource,
  CreateProspect,
  UpdateProspect,
  BulkImport,
  ColdOutreachOutput,
} from "@/lib/validations/prospect";

export interface Prospect {
  id: string;
  userId: string;
  handle: string;
  platform: string;
  source: ProspectSource | null;
  status: ProspectStatus;
  notes: string | null;
  tags: string[];
  lastContactedAt: string | null;
  contactedCount: number;
  convertedFromContentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectFilters {
  status?: ProspectStatus;
  platform?: string;
  source?: ProspectSource;
  page?: number;
  limit?: number;
}

interface ProspectListResponse {
  items: Prospect[];
  total: number;
  page: number;
  limit: number;
}

interface BulkImportResponse {
  inserted: number;
  skipped: number;
  prospects: Prospect[];
}

interface DraftOutreachResponse extends ColdOutreachOutput {
  modelUsed: string;
  tokensUsed: number;
}

export function useProspectList(filters: ProspectFilters = {}) {
  return useQuery<ProspectListResponse>({
    queryKey: ["prospects", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.source) params.set("source", filters.source);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));

      const qs = params.toString();
      const res = await fetch(`/api/prospects${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch prospects");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useProspect(id: string) {
  return useQuery<Prospect>({
    queryKey: ["prospect", id],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch prospect");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!id,
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: UpdateProspect;
    }) => {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to update prospect");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Prospect;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["prospects"] });
      await queryClient.cancelQueries({ queryKey: ["prospect", id] });

      const previousLists = queryClient.getQueriesData<ProspectListResponse>({
        queryKey: ["prospects"],
      });
      const previousItem = queryClient.getQueryData<Prospect>(["prospect", id]);

      queryClient.setQueriesData<ProspectListResponse>(
        { queryKey: ["prospects"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((p) =>
              p.id === id ? ({ ...p, ...patch } as Prospect) : p
            ),
          };
        }
      );

      if (previousItem) {
        queryClient.setQueryData<Prospect>(["prospect", id], {
          ...previousItem,
          ...patch,
        } as Prospect);
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
        queryClient.setQueryData(["prospect", vars.id], context.previousItem);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect", vars.id] });
    },
  });
}

export function useCreateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProspect) => {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to create prospect");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Prospect;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}

export function useBulkImportProspects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkImport) => {
      const res = await fetch("/api/prospects/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to import prospects");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as BulkImportResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}

export function useDraftOutreach() {
  return useMutation({
    mutationFn: async ({
      id,
      communityName,
    }: {
      id: string;
      communityName?: string;
    }) => {
      const res = await fetch(`/api/prospects/${id}/draft-outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(communityName ? { communityName } : {}),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to draft outreach");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as DraftOutreachResponse;
    },
  });
}
