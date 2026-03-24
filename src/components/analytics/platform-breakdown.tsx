"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformMetrics } from "@/types";

interface PlatformBreakdownProps {
  data: PlatformMetrics[];
}

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No platform data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    platform: d.platform.charAt(0).toUpperCase() + d.platform.slice(1),
    Reach: d.reach,
    Engagements: d.engagements,
    Impressions: d.impressions,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="platform" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Reach" fill="#3b82f6" />
            <Bar dataKey="Engagements" fill="#22c55e" />
            <Bar dataKey="Impressions" fill="#a855f7" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
