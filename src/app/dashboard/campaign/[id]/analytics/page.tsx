"use client";

import { use, useMemo } from "react";
import {
  useCampaignAnalytics,
  useGenerateInsights,
} from "@/hooks/use-analytics";
import { useCampaign, useCampaignContent } from "@/hooks/use-campaign";
import { useEngagement, useRefreshEngagement } from "@/hooks/use-engagement";
import { Scorecard } from "@/components/analytics/scorecard";
import { PlatformBreakdown } from "@/components/analytics/platform-breakdown";
import { ContentRankings } from "@/components/analytics/content-rankings";
import { PillarPerformance } from "@/components/analytics/pillar-performance";
import { AiRecommendations } from "@/components/analytics/ai-recommendations";
import {
  EngagementChart,
  type EngagementChartDatum,
} from "@/components/analytics/engagement-chart";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: campaignData, isLoading: campaignLoading } = useCampaign(id);
  const { data: analytics, isLoading: analyticsLoading } =
    useCampaignAnalytics(id);
  const generateInsights = useGenerateInsights(id);
  const {
    data: engagement,
    isLoading: engagementLoading,
    dataUpdatedAt,
  } = useEngagement(id);
  const { data: contentList } = useCampaignContent(id);
  const refreshEngagement = useRefreshEngagement(id);

  const handleGenerate = async () => {
    try {
      await generateInsights.mutateAsync();
      toast.success("Analytics insights generated!");
    } catch {
      toast.error("Failed to generate insights");
    }
  };

  const handleRefreshEngagement = async () => {
    try {
      const result = await refreshEngagement.mutateAsync();
      toast.success(`Refreshed engagement for ${result.queued} posts`);
    } catch {
      toast.error("Failed to refresh engagement data");
    }
  };

  const chartData = useMemo((): EngagementChartDatum[] => {
    if (!engagement || engagement.length === 0) return [];

    const contentMap = new Map<
      string,
      { title: string | null; aiScore: number | null }
    >();
    if (Array.isArray(contentList)) {
      for (const c of contentList) {
        contentMap.set(c.id, {
          title: c.title ?? null,
          aiScore: c.aiConfidenceScore ?? null,
        });
      }
    }

    return engagement.map((e, i) => {
      const content = contentMap.get(e.contentId);
      const label = content?.title?.slice(0, 20) ?? `${e.platform} #${i + 1}`;
      return {
        label,
        engagementRate: e.engagementRate ? parseFloat(e.engagementRate) : 0,
        aiScore: content?.aiScore ?? null,
      };
    });
  }, [engagement, contentList]);

  if (campaignLoading || analyticsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const campaignName = campaignData?.campaign?.name ?? "Campaign";

  // No analytics yet — show empty state
  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/campaign/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Analytics — {campaignName}</h1>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <BarChart3 className="text-muted-foreground h-12 w-12" />
          <h2 className="mt-4 text-xl font-semibold">No Analytics Yet</h2>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Publish content and generate insights to see performance data.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generateInsights.isPending}
            className="mt-6"
          >
            {generateInsights.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/campaign/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Analytics — {campaignName}</h1>
            <p className="text-muted-foreground text-xs">
              Last updated:{" "}
              {new Date(analytics.snapshotDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateInsights.isPending}
          variant="outline"
        >
          {generateInsights.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Refresh Insights
        </Button>
      </div>

      <Scorecard
        totalReach={analytics.totalReach}
        totalEngagements={analytics.totalEngagements}
        totalImpressions={analytics.totalImpressions}
        engagementRate={analytics.engagementRate}
        followerGrowth={analytics.followerGrowth}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-muted-foreground text-xs">
            {dataUpdatedAt
              ? `Data fetched ${new Date(dataUpdatedAt).toLocaleString()}`
              : "No engagement data fetched yet"}
          </div>
          <Button
            onClick={handleRefreshEngagement}
            disabled={refreshEngagement.isPending}
            variant="ghost"
            size="sm"
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${refreshEngagement.isPending ? "animate-spin" : ""}`}
            />
            Refresh Data
          </Button>
        </div>
        <EngagementChart data={chartData} isLoading={engagementLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlatformBreakdown data={analytics.platformBreakdown} />
        <PillarPerformance data={analytics.pillarBreakdown} />
      </div>

      <ContentRankings rankings={analytics.contentRankings} />

      <AiRecommendations
        insights={analytics.aiInsights}
        recommendations={analytics.aiRecommendations}
      />
    </div>
  );
}
