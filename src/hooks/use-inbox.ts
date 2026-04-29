import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { inboxStatusValues } from "@/lib/validations/inbox";

// Client-side type (dates serialized as strings over JSON)
export interface InboxItem {
  id: string;
  userId: string;
  campaignId: string | null;
  contentId: string | null;
  platform: string;
  authorHandle: string;
  authorDisplayName: string | null;
  messageText: string;
  messageType: "comment" | "reply" | "mention" | "dm";
  status: "unread" | "read" | "replied";
  platformMessageId: string;
  receivedAt: string;
  createdAt: string | null;
}

export interface InboxFilters {
  status?: (typeof inboxStatusValues)[number];
  platform?: string;
  campaignId?: string;
  page?: number;
  limit?: number;
}

interface InboxListResponse {
  items: InboxItem[];
  total: number;
  page: number;
  limit: number;
}

export function useInboxList(filters: InboxFilters = {}) {
  return useQuery<InboxListResponse>({
    queryKey: ["inbox", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.campaignId) params.set("campaignId", filters.campaignId);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));

      const res = await fetch(`/api/inbox?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inbox items");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useUpdateInboxStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/inbox/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update inbox status");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["inbox"] });

      const previousData = queryClient.getQueriesData<InboxListResponse>({
        queryKey: ["inbox"],
      });

      queryClient.setQueriesData<InboxListResponse>(
        { queryKey: ["inbox"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id
                ? { ...item, status: status as InboxItem["status"] }
                : item
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        for (const [key, data] of context.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unread"] });
    },
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ["inbox-unread"],
    queryFn: async () => {
      const res = await fetch("/api/inbox?status=unread&limit=1");
      if (!res.ok) throw new Error("Failed to fetch unread count");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data.total;
    },
  });
}
