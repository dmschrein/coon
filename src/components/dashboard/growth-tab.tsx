"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGrowthSummary } from "@/hooks/use-growth-summary";
import { GrowthStatCards } from "./growth-stat-cards";
import { ProspectFunnel } from "./prospect-funnel";

const LINE_COLOR = "#7C3AED";

export function GrowthTab() {
  const { data, isLoading, isError } = useGrowthSummary();

  if (isLoading) {
    return <GrowthTabSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-red-600">
            Could not load growth data. Try refreshing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Member Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div aria-label="Member growth over the last 8 weeks">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.memberCountByWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <GrowthStatCards
        thisWeek={data.newMembersThisWeek}
        lastWeek={data.newMembersLastWeek}
      />

      <TopConvertingContent items={data.topConvertingContent} />

      <ProspectFunnel
        prospectsByStatus={data.prospectsByStatus}
        conversionRate={data.prospectConversionRate}
      />
    </div>
  );
}

interface TopConvertingContentProps {
  items: Array<{ title: string; joins: number }>;
}

function TopConvertingContent({ items }: TopConvertingContentProps) {
  return (
    <Card aria-label="Top converting content">
      <CardHeader>
        <CardTitle>Top Converting Content</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No converting content yet.
          </p>
        ) : (
          <ol className="space-y-2">
            {items.slice(0, 5).map((item, idx) => (
              <li
                key={`${item.title}-${idx}`}
                className="bg-muted/30 flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="flex items-center gap-3 truncate">
                  <span className="text-muted-foreground w-5 text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <span className="truncate text-sm">{item.title}</span>
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {item.joins} joins
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function GrowthTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-muted h-[260px] animate-pulse rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="bg-muted h-24 animate-pulse rounded-xl" />
        <div className="bg-muted h-24 w-20 animate-pulse rounded-xl" />
        <div className="bg-muted h-24 animate-pulse rounded-xl" />
      </div>
      <div className="bg-muted h-40 animate-pulse rounded-xl" />
      <div className="bg-muted h-48 animate-pulse rounded-xl" />
    </div>
  );
}
