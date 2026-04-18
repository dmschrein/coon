"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Pencil, Trash2 } from "lucide-react";
import type { ContentPillar } from "@/types";
import Link from "next/link";

interface ContentSummary {
  totalPieces: number;
  completedPieces: number;
  platformCounts: Record<string, number>;
}

interface CampaignOverviewProps {
  strategySummary: string | null;
  contentPillars: ContentPillar[] | null;
  selectedPlatforms: string[];
  status: string;
  contentSummary?: ContentSummary;
  campaignId?: string;
}

const PILLAR_COLORS = [
  "border-l-blue-500",
  "border-l-emerald-500",
  "border-l-violet-500",
  "border-l-amber-500",
  "border-l-rose-500",
];

export function CampaignOverview({
  strategySummary,
  contentPillars,
  selectedPlatforms,
  status,
  contentSummary,
  campaignId,
}: CampaignOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Strategy Summary */}
      {strategySummary && (
        <Card>
          <CardHeader>
            <CardTitle>Strategy Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{strategySummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Content Pillars */}
      {contentPillars && contentPillars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Content Pillars</CardTitle>
            <CardDescription>
              Core themes guiding your campaign content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {contentPillars.map((pillar, idx) => (
                <div
                  key={idx}
                  className={`space-y-2 rounded-lg border border-l-4 p-4 ${PILLAR_COLORS[idx % PILLAR_COLORS.length]}`}
                >
                  <h4 className="font-semibold">{pillar.theme}</h4>
                  <p className="text-muted-foreground text-sm">
                    {pillar.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {pillar.sampleTopics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Addresses: {pillar.targetedPainPoint}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Breakdown */}
      {contentSummary &&
        Object.keys(contentSummary.platformCounts).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Platform Breakdown</CardTitle>
              <CardDescription>
                {contentSummary.completedPieces} of {contentSummary.totalPieces}{" "}
                pieces generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(contentSummary.platformCounts).map(
                  ([platform, count]) => (
                    <div
                      key={platform}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="font-medium capitalize">{platform}</span>
                      <Badge variant="secondary">
                        {count} piece{count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Platforms + Status (simple fallback when no content summary) */}
      {!contentSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedPlatforms.map((platform) => (
                <Badge key={platform} variant="outline">
                  {platform}
                </Badge>
              ))}
            </div>
            <div className="mt-3">
              <Badge variant={status === "complete" ? "default" : "secondary"}>
                {status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {campaignId && contentSummary && contentSummary.completedPieces > 0 && (
        <div className="flex flex-wrap gap-3">
          <Link href={`/dashboard/campaign/${campaignId}/review`}>
            <Button>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Review All Content
            </Button>
          </Link>
          <Link href={`/dashboard/campaign/${campaignId}`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit Campaign
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
