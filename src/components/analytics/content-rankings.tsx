"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentRanking } from "@/types";

interface ContentRankingsProps {
  rankings: ContentRanking[];
}

type SortKey = "engagements" | "reach" | "engagementRate";

export function ContentRankings({ rankings }: ContentRankingsProps) {
  const [sortBy, setSortBy] = useState<SortKey>("engagements");

  const sorted = [...rankings].sort((a, b) => b[sortBy] - a[sortBy]);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No content metrics available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Content Rankings</CardTitle>
        <div className="flex gap-1">
          {(["engagements", "reach", "engagementRate"] as SortKey[]).map(
            (key) => (
              <Button
                key={key}
                variant={sortBy === key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSortBy(key)}
              >
                <ArrowUpDown className="mr-1 h-3 w-3" />
                {key === "engagementRate" ? "Rate" : key}
              </Button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.slice(0, 10).map((item, i) => (
            <div
              key={item.contentId}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-6 text-right font-mono text-sm">
                  #{i + 1}
                </span>
                <div>
                  <span className="text-sm font-medium">
                    {item.title ?? "Untitled"}
                  </span>
                  <div className="mt-0.5 flex gap-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.platform}
                    </Badge>
                    {item.pillar && (
                      <Badge variant="secondary" className="text-xs">
                        {item.pillar}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 text-right text-sm">
                <div>
                  <div className="font-medium">{item.reach}</div>
                  <div className="text-muted-foreground text-xs">reach</div>
                </div>
                <div>
                  <div className="font-medium">{item.engagements}</div>
                  <div className="text-muted-foreground text-xs">engage</div>
                </div>
                <div>
                  <div className="font-medium">
                    {item.engagementRate.toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-xs">rate</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
