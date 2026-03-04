"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types";

interface ContentItem {
  id: string;
  platform: string;
  contentType: string;
  pillar: string | null;
  title: string | null;
  body: string;
  hashtags: string[] | null;
  cta: string | null;
  status: string | null;
  createdAt: string;
}

export function useContentList(filters?: { platform?: string; status?: string }) {
  return useQuery({
    queryKey: ["content", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.platform) params.set("platform", filters.platform);
      if (filters?.status) params.set("status", filters.status);
      const url = `/api/content${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      const json: ApiResponse<ContentItem[]> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useContentItem(id: string) {
  return useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const res = await fetch(`/api/content/${id}`);
      const json: ApiResponse<ContentItem> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    enabled: !!id,
  });
}

export function useGenerateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/content", { method: "POST" });
      const json: ApiResponse<ContentItem[]> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; body?: string; hashtags?: string[]; cta?: string; status?: string }) => {
      const res = await fetch(`/api/content/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<ContentItem> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });
}
