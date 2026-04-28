"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AudienceProfile,
  AudienceProfileChange,
  ConfidenceLevel,
  FeedbackLoopOutput,
  ApiResponse,
} from "@/types";

export function useAudienceProfile() {
  return useQuery({
    queryKey: ["audience-profile"],
    queryFn: async () => {
      const res = await fetch("/api/audience-profile");
      const json: ApiResponse<{
        id: string;
        profileData: AudienceProfile;
        confidenceLevel: ConfidenceLevel;
        analyticsData: Record<string, unknown> | null;
        generatedAt: string;
      } | null> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useRegenerateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/audience-profile/regenerate", {
        method: "POST",
      });
      const json: ApiResponse<{ id: string; profileData: AudienceProfile }> =
        await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-profile"] });
    },
  });
}

export function useRefineProfile() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/audience-profile/refine", {
        method: "POST",
      });
      const json: ApiResponse<FeedbackLoopOutput> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useApplyRefinements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: AudienceProfileChange[]) => {
      const res = await fetch("/api/audience-profile/refine/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      const json: ApiResponse<{ id: string; profileData: AudienceProfile }> =
        await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-profile"] });
    },
  });
}
