"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentApprovalStatus, CampaignPlatform } from "@/types";

interface FilterBarProps {
  platforms: CampaignPlatform[];
  pillars: string[];
  activePlatform: CampaignPlatform | null;
  activePillar: string | null;
  activeStatus: ContentApprovalStatus | null;
  onPlatformChange: (platform: CampaignPlatform | null) => void;
  onPillarChange: (pillar: string | null) => void;
  onStatusChange: (status: ContentApprovalStatus | null) => void;
}

const statuses: { value: ContentApprovalStatus; label: string }[] = [
  { value: "pending_review", label: "Pending" },
  { value: "needs_revision", label: "Revision" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function FilterBar({
  platforms,
  pillars,
  activePlatform,
  activePillar,
  activeStatus,
  onPlatformChange,
  onPillarChange,
  onStatusChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm font-medium">Filter:</span>

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

      {pillars.length > 0 && <span className="text-muted-foreground">|</span>}

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

      {(activePlatform || activePillar || activeStatus) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onPlatformChange(null);
            onPillarChange(null);
            onStatusChange(null);
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
