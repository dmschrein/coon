import { DollarSign, Handshake, Crown, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReadinessOutput } from "@/types";

interface HubStatGridProps {
  data: {
    readiness: ReadinessOutput | null;
    revenueThisMonth: number;
    pipelineValue: number;
    activeTierCount: number;
  };
}

function formatDollars(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString("en-US")}`;
}

export function HubStatGrid({ data }: HubStatGridProps) {
  const stats = [
    {
      label: "Revenue this month",
      value: formatDollars(data.revenueThisMonth),
      icon: DollarSign,
      iconColor: "text-green-500",
    },
    {
      label: "Pipeline value",
      value: formatDollars(data.pipelineValue),
      icon: Handshake,
      iconColor: "text-blue-500",
    },
    {
      label: "Active tiers",
      value: String(data.activeTierCount),
      icon: Crown,
      iconColor: "text-purple-500",
    },
    {
      label: "Overall readiness",
      value: data.readiness != null ? String(data.readiness.overallScore) : "—",
      icon: Gauge,
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div
      data-testid="monetization-stat-grid"
      className="grid grid-cols-2 gap-4 md:grid-cols-4"
    >
      {stats.map((stat) => (
        <Card key={stat.label} data-testid="monetization-stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {stat.label}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
