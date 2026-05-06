"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCampaignContent } from "@/hooks/use-campaign";
import { useInboxList } from "@/hooks/use-inbox";
import { useRituals, type RitualTemplateClient } from "@/hooks/use-rituals";
import type { InboxItem } from "@/hooks/use-inbox";
import {
  readSeedsThisWeek,
  subscribeToSeedsCounter,
} from "@/lib/seeds-counter";

interface ActivityHealthCardProps {
  campaignId: string | null;
  initialTemplates: RitualTemplateClient[];
}

interface ContentRow {
  postedAt: string | null;
  contentType: string | null;
}

const POSTS_TARGET = 5;
const RITUALS_TARGET = 5;
const SEEDS_TARGET = 10;
const RESPONSE_TARGET_HOURS = 24;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function pct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

function computePostsThisWeek(rows: ContentRow[] | undefined): number {
  if (!rows) return 0;
  const cutoff = Date.now() - WEEK_MS;
  return rows.filter(
    (c) => c.postedAt && new Date(c.postedAt).getTime() >= cutoff
  ).length;
}

function computeAvgResponseHours(items: InboxItem[]): number {
  if (items.length === 0) return 0;
  const now = Date.now();
  const totalMs = items.reduce(
    (sum, item) => sum + (now - new Date(item.receivedAt).getTime()),
    0
  );
  return totalMs / items.length / HOUR_MS;
}

export function ActivityHealthCard({
  campaignId,
  initialTemplates,
}: ActivityHealthCardProps) {
  const { data: content } = useCampaignContent(campaignId ?? "");
  const { data: inbox } = useInboxList(
    campaignId ? { campaignId, status: "replied", limit: 100 } : {}
  );
  const { data: rituals } = useRituals(initialTemplates);

  const getSeedsSnapshot = useCallback(
    () => readSeedsThisWeek(campaignId),
    [campaignId]
  );
  const seedsThisWeek = useSyncExternalStore(
    subscribeToSeedsCounter,
    getSeedsSnapshot,
    () => 0
  );

  const postsThisWeek = computePostsThisWeek(
    content as ContentRow[] | undefined
  );
  const avgResponseHours = computeAvgResponseHours(inbox?.items ?? []);
  const activeRituals = (rituals?.items ?? []).filter((r) => r.isActive).length;

  const responseProgress =
    avgResponseHours === 0
      ? 0
      : Math.max(0, 1 - avgResponseHours / RESPONSE_TARGET_HOURS) * 100;

  const metrics = [
    {
      key: "posts",
      title: "Posts This Week",
      value: `${postsThisWeek} / ${POSTS_TARGET}`,
      caption: "Target: 5 posts per week",
      progress: pct(postsThisWeek, POSTS_TARGET),
    },
    {
      key: "response",
      title: "Avg Response Time",
      value:
        avgResponseHours === 0
          ? "—"
          : `${avgResponseHours.toFixed(1)}h (approx)`,
      caption: `Target: under ${RESPONSE_TARGET_HOURS}h`,
      progress: responseProgress,
    },
    {
      key: "rituals",
      title: "Active Rituals",
      value: `${activeRituals} / ${RITUALS_TARGET}`,
      caption: "Target: 5 active rituals",
      progress: pct(activeRituals, RITUALS_TARGET),
    },
    {
      key: "seeds",
      title: "Seeds Used This Week",
      value: `${seedsThisWeek} / ${SEEDS_TARGET}`,
      caption: "Target: 10 seeds per week",
      progress: pct(seedsThisWeek, SEEDS_TARGET),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {metrics.map((m) => (
        <Card key={m.key}>
          <CardHeader>
            <CardTitle className="text-base">{m.title}</CardTitle>
            <CardDescription>{m.caption}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-semibold">{m.value}</div>
            <Progress value={m.progress} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
