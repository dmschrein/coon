import { useQuery } from "@tanstack/react-query";
import type { ReadinessOutput } from "@/types";

const QUERY_KEY = ["monetization-readiness"] as const;

export function useMonetizationReadiness(enabled = true) {
  return useQuery<ReadinessOutput | null>({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/monetization/readiness");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to fetch monetization readiness"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as ReadinessOutput | null;
    },
  });
}
