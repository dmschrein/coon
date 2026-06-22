import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MonetizationConfig } from "@/types";

const QUERY_KEY = ["monetization-config"] as const;

export function useMonetizationConfig() {
  return useQuery<MonetizationConfig | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/monetization/config");
      if (!res.ok) throw new Error("Failed to fetch monetization config");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as MonetizationConfig | null;
    },
  });
}

export function useSaveMonetizationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MonetizationConfig) => {
      const res = await fetch("/api/monetization/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to save monetization config"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as MonetizationConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
