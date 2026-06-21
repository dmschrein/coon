import { useQuery } from "@tanstack/react-query";
import type { MonetizationConfig, ReadinessOutput } from "@/types";

export interface MonetizationHubData {
  config: MonetizationConfig | null;
  readiness: ReadinessOutput | null;
  revenueThisMonth: number;
  pipelineValue: number;
  activeTierCount: number;
}

const QUERY_KEY = ["monetization-hub"] as const;

export function useMonetizationHub(initialData?: MonetizationHubData) {
  return useQuery<MonetizationHubData>({
    queryKey: QUERY_KEY,
    initialData,
    queryFn: async () => {
      const res = await fetch("/api/monetization/hub");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error?.message ?? "Failed to fetch monetization hub"
        );
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data as MonetizationHubData;
    },
  });
}
