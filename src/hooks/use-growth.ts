import { useQuery } from "@tanstack/react-query";

export interface GrowthAttributionContent {
  contentId: string;
  title: string | null;
  pillar: string | null;
  platform: string;
  joins: number;
}

export interface GrowthAttribution {
  topConvertingContent: GrowthAttributionContent[];
  topConvertingPlatform: { platform: string; joins: number } | null;
  topConvertingPillar: { pillar: string; joins: number } | null;
  joinsByPillar: Array<{ pillar: string; joins: number }>;
  totalJoins: number;
}

export interface RecentContent {
  id: string;
  title: string | null;
  platform: string;
  pillar: string | null;
}

export function useGrowthAttribution() {
  return useQuery<GrowthAttribution>({
    queryKey: ["growth-attribution"],
    queryFn: async () => {
      const res = await fetch("/api/growth/attribution");
      if (!res.ok) throw new Error("Failed to fetch growth attribution");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useRecentContent(limit = 20) {
  return useQuery<RecentContent[]>({
    queryKey: ["content", "recent", limit],
    queryFn: async () => {
      const res = await fetch(`/api/content/recent?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch recent content");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.data;
    },
  });
}
