"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PillarMetrics } from "@/types";

interface PillarPerformanceProps {
  data: PillarMetrics[];
}

export function PillarPerformance({ data }: PillarPerformanceProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pillar Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No pillar data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    pillar: d.pillar.length > 15 ? d.pillar.slice(0, 15) + "..." : d.pillar,
    "Avg Rate (%)": d.avgEngagementRate,
    Engagements: d.totalEngagements,
    Posts: d.contentCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pillar Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="pillar" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Engagements" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {data.map((d) => (
            <div
              key={d.pillar}
              className="rounded-md border p-2 text-center text-xs"
            >
              <div className="font-medium">{d.pillar}</div>
              <div className="text-muted-foreground">
                {d.avgEngagementRate.toFixed(1)}% rate · {d.contentCount} posts
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
