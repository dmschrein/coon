"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarChip } from "./calendar-chip";
import { cn } from "@/lib/utils";
import type {
  CampaignPlatform,
  ReviewBoardColumn,
  ContentApprovalStatus,
} from "@/types";

interface CalendarItem {
  id: string;
  platform: CampaignPlatform;
  scheduledFor: Date | null;
  boardColumn: ReviewBoardColumn;
  contentType?: string | null;
  pillar: string | null;
}

interface CalendarViewProps {
  items: CalendarItem[];
  platforms: CampaignPlatform[];
  onCardClick: (id: string) => void;
}

const platformLabels: Record<string, string> = {
  twitter: "Twitter/X",
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  youtube: "YouTube",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  discord: "Discord",
  email: "Email",
  blog: "Blog",
  pinterest: "Pinterest",
};

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDays(baseDate: Date): Date[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({
  items,
  platforms,
  onCardClick,
}: CalendarViewProps) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [baseDate, setBaseDate] = useState(() => new Date());

  const days = useMemo(
    () => (mode === "week" ? getWeekDays(baseDate) : getMonthDays(baseDate)),
    [mode, baseDate]
  );

  // Pre-compute lookup: "platform-YYYY-MM-DD" -> items[]
  const cellMap = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (!item.scheduledFor) continue;
      const key = `${item.platform}-${dateKey(new Date(item.scheduledFor))}`;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const unscheduledCount = items.filter((i) => !i.scheduledFor).length;

  const navigate = (direction: -1 | 1) => {
    setBaseDate((prev) => {
      const next = new Date(prev);
      if (mode === "week") next.setDate(next.getDate() + direction * 7);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const formatHeader = () => {
    if (mode === "week") {
      const start = days[0];
      const end = days[days.length - 1];
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return baseDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-48 text-center text-sm font-medium">
            {formatHeader()}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            size="sm"
            variant={mode === "week" ? "default" : "ghost"}
            onClick={() => setMode("week")}
          >
            Week
          </Button>
          <Button
            size="sm"
            variant={mode === "month" ? "default" : "ghost"}
            onClick={() => setMode("month")}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-[600px]"
          style={{
            gridTemplateColumns: `120px repeat(${days.length}, minmax(80px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="bg-muted/50 border-b p-2" />
          {days.map((day) => {
            const isToday = dateKey(day) === dateKey(new Date());
            return (
              <div
                key={dateKey(day)}
                className={cn(
                  "border-b border-l p-2 text-center text-xs",
                  isToday && "bg-primary/5 font-bold"
                )}
              >
                <div className="text-muted-foreground">
                  {DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                </div>
                <div>{day.getDate()}</div>
              </div>
            );
          })}

          {/* Platform rows */}
          {platforms.map((platform) => (
            <>
              <div
                key={`label-${platform}`}
                className="bg-muted/30 flex items-center border-b px-3 py-2 text-xs font-medium"
              >
                {platformLabels[platform] ?? platform}
              </div>
              {days.map((day) => {
                const key = `${platform}-${dateKey(day)}`;
                const cellItems = cellMap.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className="min-h-12 space-y-0.5 border-b border-l p-1"
                  >
                    {cellItems.map((item) => (
                      <CalendarChip
                        key={item.id}
                        contentType={item.contentType ?? null}
                        pillar={item.pillar}
                        boardColumn={item.boardColumn}
                        onClick={() => onCardClick(item.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Unscheduled notice */}
      {unscheduledCount > 0 && (
        <p className="text-muted-foreground text-sm">
          {unscheduledCount} content piece{unscheduledCount !== 1 ? "s" : ""}{" "}
          not scheduled — switch to Board View to manage them.
        </p>
      )}
    </div>
  );
}
