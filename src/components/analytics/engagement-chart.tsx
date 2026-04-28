"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface EngagementChartDatum {
  label: string;
  engagementRate: number;
  aiScore: number | null;
}

interface EngagementChartProps {
  data: EngagementChartDatum[];
  isLoading?: boolean;
}

export function EngagementChart({ data, isLoading }: EngagementChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engagement vs AI Score</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engagement vs AI Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No engagement data available yet. Publish content and fetch
            engagement metrics to see performance trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement vs AI Score</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              label={{
                value: "Engagement %",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              label={{
                value: "AI Score",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 11 },
              }}
            />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="engagementRate"
              name="Engagement Rate (%)"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="aiScore"
              name="AI Score"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
