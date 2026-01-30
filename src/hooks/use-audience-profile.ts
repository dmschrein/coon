"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AudienceProfile, ApiResponse } from "@/types";

export function useAudienceProfile() {
  return useQuery({
    queryKey: ["audience-profile"],
    queryFn: async () => {
      const res = await fetch("/api/audience-profile");
      const json: ApiResponse<{ id: string; profileData: AudienceProfile; generatedAt: string } | null> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useRegenerateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/audience-profile/regenerate", { method: "POST" });
      const json: ApiResponse<{ id: string; profileData: AudienceProfile }> = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience-profile"] });
    },
  });
}
