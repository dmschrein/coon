"use client";

import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const color =
    score >= 8
      ? "bg-green-100 text-green-800"
      : score >= 5
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  return (
    <Badge className={`${color} text-xs`} variant="secondary">
      {score}/10
    </Badge>
  );
}
