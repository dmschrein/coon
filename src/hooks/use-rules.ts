import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CommunityRule, RulesTone } from "@/types";

const QUERY_KEY = ["community-rules"] as const;

export function useRules() {
  return useQuery<CommunityRule[] | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/community/rules");
      if (!res.ok) throw new Error("Failed to fetch rules");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as CommunityRule[] | null;
    },
  });
}

export interface GenerateRulesInput {
  tone?: RulesTone;
}

export function useGenerateRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateRulesInput = {}) => {
      const res = await fetch("/api/community/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to generate rules");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as CommunityRule[];
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}

export function useSaveRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rules: CommunityRule[]) => {
      const res = await fetch("/api/community/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? "Failed to save rules");
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as CommunityRule[];
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}
