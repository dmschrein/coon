"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CampaignPlatform,
  ReviewBoardColumn,
  ContentFormatType,
} from "@/types";

interface FilterBarProps {
  platforms: CampaignPlatform[];
  pillars: string[];
  contentTypes: string[];
  activePlatform: CampaignPlatform | null;
  activePillar: string | null;
  activeStatus: ReviewBoardColumn | null;
  activeContentType: string | null;
  onPlatformChange: (platform: CampaignPlatform | null) => void;
  onPillarChange: (pillar: string | null) => void;
  onStatusChange: (status: ReviewBoardColumn | null) => void;
  onContentTypeChange: (type: string | null) => void;
}

const statuses: { value: ReviewBoardColumn; label: string }[] = [
  { value: "pending_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Posted" },
];

export function FilterBar({
  platforms,
  pillars,
  contentTypes,
  activePlatform,
  activePillar,
  activeStatus,
  activeContentType,
  onPlatformChange,
  onPillarChange,
  onStatusChange,
  onContentTypeChange,
}: FilterBarProps) {
  const hasActiveFilter =
    activePlatform || activePillar || activeStatus || activeContentType;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm font-medium">
        Platform:
      </span>
      {platforms.map((p) => (
        <Badge
          key={p}
          variant={activePlatform === p ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onPlatformChange(activePlatform === p ? null : p)}
        >
          {p}
        </Badge>
      ))}

      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground text-sm font-medium">Status:</span>
      {statuses.map((s) => (
        <Badge
          key={s.value}
          variant={activeStatus === s.value ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() =>
            onStatusChange(activeStatus === s.value ? null : s.value)
          }
        >
          {s.label}
        </Badge>
      ))}

      {contentTypes.length > 0 && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground text-sm font-medium">
            Type:
          </span>
          {contentTypes.map((ct) => (
            <Badge
              key={ct}
              variant={activeContentType === ct ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() =>
                onContentTypeChange(activeContentType === ct ? null : ct)
              }
            >
              {ct}
            </Badge>
          ))}
        </>
      )}

      {pillars.length > 0 && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground text-sm font-medium">
            Pillar:
          </span>
          {pillars.map((pillar) => (
            <Badge
              key={pillar}
              variant={activePillar === pillar ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() =>
                onPillarChange(activePillar === pillar ? null : pillar)
              }
            >
              {pillar}
            </Badge>
          ))}
        </>
      )}

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onPlatformChange(null);
            onPillarChange(null);
            onStatusChange(null);
            onContentTypeChange(null);
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
