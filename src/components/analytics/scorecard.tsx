"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Eye, BarChart3 } from "lucide-react";

interface ScorecardProps {
  totalReach: number;
  totalEngagements: number;
  totalImpressions: number;
  engagementRate: number;
  followerGrowth: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function Scorecard({
  totalReach,
  totalEngagements,
  totalImpressions,
  engagementRate,
  followerGrowth,
}: ScorecardProps) {
  const metrics = [
    {
      label: "Total Reach",
      value: formatNumber(totalReach),
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "Engagements",
      value: formatNumber(totalEngagements),
      icon: BarChart3,
      color: "text-green-500",
    },
    {
      label: "Impressions",
      value: formatNumber(totalImpressions),
      icon: Eye,
      color: "text-purple-500",
    },
    {
      label: "Engagement Rate",
      value: `${engagementRate.toFixed(2)}%`,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {metric.label}
            </CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            {metric.label === "Engagement Rate" && followerGrowth > 0 && (
              <p className="text-muted-foreground text-xs">
                +{followerGrowth} followers
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
