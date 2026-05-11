"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProspectStatusBucket } from "@/lib/validations/growth";

interface ProspectFunnelProps {
  prospectsByStatus: ProspectStatusBucket;
  conversionRate: number;
}

const STAGES: Array<{ key: keyof ProspectStatusBucket; label: string }> = [
  { key: "cold", label: "Cold" },
  { key: "contacted", label: "Contacted" },
  { key: "responded", label: "Responded" },
  { key: "joined", label: "Joined" },
];

export function ProspectFunnel({
  prospectsByStatus,
  conversionRate,
}: ProspectFunnelProps) {
  return (
    <Card aria-label="Prospect conversion funnel">
      <CardHeader>
        <CardTitle>Prospect Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="flex flex-wrap items-stretch gap-2">
          {STAGES.map((stage, idx) => {
            const isJoined = stage.key === "joined";
            const count = prospectsByStatus[stage.key];
            return (
              <li
                key={stage.key}
                className="flex flex-1 items-center gap-2"
                aria-label={`${stage.label}: ${count}`}
              >
                <div
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center rounded-md border p-3 text-center",
                    isJoined
                      ? "border-violet-600 bg-violet-50 text-violet-900"
                      : "bg-muted/40"
                  )}
                >
                  <span className="text-muted-foreground text-xs tracking-wide uppercase">
                    {stage.label}
                  </span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                {idx < STAGES.length - 1 && (
                  <ChevronRight
                    className="text-muted-foreground h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
        <p
          className="text-sm font-medium"
          aria-label={`Overall conversion rate: ${conversionRate.toFixed(1)} percent`}
        >
          Overall conversion:{" "}
          <span className="text-violet-700">{conversionRate.toFixed(1)}%</span>
        </p>
      </CardContent>
    </Card>
  );
}
