"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface GrowthStatCardsProps {
  thisWeek: number;
  lastWeek: number;
}

export function GrowthStatCards({ thisWeek, lastWeek }: GrowthStatCardsProps) {
  const delta = thisWeek - lastWeek;
  const direction: "up" | "down" | "neutral" =
    delta > 0 ? "up" : delta < 0 ? "down" : "neutral";

  const label =
    direction === "up"
      ? `+${delta}`
      : direction === "down"
        ? `${delta}`
        : "No change";

  const ariaLabel =
    direction === "up"
      ? `Up ${delta} from last week`
      : direction === "down"
        ? `Down ${Math.abs(delta)} from last week`
        : "No change from last week";

  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;

  const color =
    direction === "up"
      ? "text-green-600"
      : direction === "down"
        ? "text-red-600"
        : "text-muted-foreground";

  return (
    <section
      aria-label="Member growth this week vs last week"
      className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]"
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            New Members This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold" data-testid="stat-this-week">
            {thisWeek}
          </div>
        </CardContent>
      </Card>

      <div
        className="flex items-center justify-center"
        data-testid="delta-indicator"
        data-direction={direction}
        aria-label={ariaLabel}
      >
        <div
          className={cn(
            "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium",
            color
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            New Members Last Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold" data-testid="stat-last-week">
            {lastWeek}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
