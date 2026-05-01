import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MemberStatus, UpdateMember } from "@/lib/validations/member";

export interface Member {
  id: string;
  userId: string;
  platform: string;
  platformUserId: string;
  username: string;
  displayName: string | null;
  firstSeenAt: string;
  engagementCount: number;
  lastSeenAt: string;
  status: MemberStatus;
  tags: string[];
  notes: string | null;
}

export interface MemberFilters {
  status?: MemberStatus;
  platform?: string;
  minEngagement?: number;
  page?: number;
  limit?: number;
}

interface MemberListResponse {
  items: Member[];
  total: number;
  page: number;
  limit: number;
}

export function useMembers(filters: MemberFilters = {}) {
  return useQuery<MemberListResponse>({
    queryKey: ["members", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.minEngagement !== undefined)
        params.set("minEngagement", String(filters.minEngagement));
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));

      const qs = params.toString();
      const res = await fetch(`/api/members${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useMember(id: string) {
  return useQuery<Member>({
    queryKey: ["member", id],
    queryFn: async () => {
      const res = await fetch(`/api/members/${id}`);
      if (!res.ok) throw new Error("Failed to fetch member");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!id,
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateMember }) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to update member");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as Member;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["members"] });
      await queryClient.cancelQueries({ queryKey: ["member", id] });

      const previousLists = queryClient.getQueriesData<MemberListResponse>({
        queryKey: ["members"],
      });
      const previousItem = queryClient.getQueryData<Member>(["member", id]);

      queryClient.setQueriesData<MemberListResponse>(
        { queryKey: ["members"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((m) =>
              m.id === id ? ({ ...m, ...patch } as Member) : m
            ),
          };
        }
      );

      if (previousItem) {
        queryClient.setQueryData<Member>(["member", id], {
          ...previousItem,
          ...patch,
        } as Member);
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
        queryClient.setQueryData(["member", vars.id], context.previousItem);
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["member", vars.id] });
    },
  });
}
