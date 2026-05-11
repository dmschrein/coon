import { useQuery } from "@tanstack/react-query";
import type { GrowthSummary } from "@/lib/validations/growth";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useGrowthSummary() {
  return useQuery<GrowthSummary>({
    queryKey: ["growth", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/growth/summary");
      if (!res.ok) throw new Error("Failed to fetch growth summary");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
}
