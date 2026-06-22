"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { RevenueEntry } from "@/lib/validations/revenue";

interface RevenueChartsProps {
  entries: RevenueEntry[];
}

const PIE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
];

function monthKey(iso: string): string {
  // Date-only strings are interpreted in UTC; this keeps month grouping stable
  // regardless of viewer timezone.
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function RevenueCharts({ entries }: RevenueChartsProps) {
  const composedData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const k = monthKey(e.date);
      map.set(k, (map.get(k) ?? 0) + e.amountCents);
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    );
    return sorted.reduce<
      Array<{ month: string; total: number; cumulative: number }>
    >((acc, [month, total], i) => {
      const prev = i === 0 ? 0 : acc[i - 1].cumulative * 100;
      const cumulativeCents = prev + total;
      acc.push({
        month,
        total: total / 100,
        cumulative: cumulativeCents / 100,
      });
      return acc;
    }, []);
  }, [entries]);

  const pieData = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const e of entries) {
      byType[e.type] = (byType[e.type] ?? 0) + e.amountCents;
    }
    return Object.entries(byType).map(([type, total]) => ({
      name: type,
      value: total / 100,
    }));
  }, [entries]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue & Cumulative</CardTitle>
        </CardHeader>
        <CardContent>
          {composedData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No revenue entries yet. Add your first entry to see trends.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={composedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(Math.round(Number(value) * 100))
                  }
                />
                <Legend />
                <Bar dataKey="total" name="Monthly" fill="#6366f1" />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative"
                  stroke="#22c55e"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No revenue entries yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(Math.round(Number(value) * 100))
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
