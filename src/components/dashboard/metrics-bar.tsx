"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Zap, FileText, Shield } from "lucide-react";

interface MetricsBarProps {
  totalCampaigns: number;
  activeCampaigns: number;
  totalContentPieces: number;
  confidenceLevel: string;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  quiz_based: "Quiz-based",
  data_informed: "Data-informed",
  data_validated: "Data-validated",
};

export function MetricsBar({
  totalCampaigns,
  activeCampaigns,
  totalContentPieces,
  confidenceLevel,
}: MetricsBarProps) {
  const metrics = [
    {
      label: "Total Campaigns",
      value: totalCampaigns,
      icon: Megaphone,
      color: "text-blue-500",
    },
    {
      label: "Active",
      value: activeCampaigns,
      icon: Zap,
      color: "text-green-500",
    },
    {
      label: "Content Pieces",
      value: totalContentPieces,
      icon: FileText,
      color: "text-purple-500",
    },
    {
      label: "Audience Confidence",
      value: CONFIDENCE_LABELS[confidenceLevel] ?? confidenceLevel,
      icon: Shield,
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
