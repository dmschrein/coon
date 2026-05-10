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

interface GrowthAttributionChartProps {
  data: Array<{ pillar: string; joins: number }>;
}

export function GrowthAttributionChart({ data }: GrowthAttributionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Growth Attribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No conversions tracked yet. Mark prospects as joined from the
            outreach board to see which content drives growth.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    pillar: d.pillar.length > 15 ? d.pillar.slice(0, 15) + "..." : d.pillar,
    Joins: d.joins,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth Attribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="pillar" width={120} />
            <Tooltip />
            <Bar dataKey="Joins" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
