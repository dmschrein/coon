"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inboxStatusValues } from "@/lib/validations/inbox";

interface InboxFilterBarProps {
  activeStatus: string | null;
  activePlatform: string | null;
  platforms: string[];
  onStatusChange: (status: string | null) => void;
  onPlatformChange: (platform: string | null) => void;
}

const statusLabels: Record<string, string> = {
  unread: "Unread",
  read: "Read",
  replied: "Replied",
};

export function InboxFilterBar({
  activeStatus,
  activePlatform,
  platforms,
  onStatusChange,
  onPlatformChange,
}: InboxFilterBarProps) {
  const hasActiveFilter = activeStatus || activePlatform;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm font-medium">Status:</span>
      {inboxStatusValues.map((s) => (
        <Badge
          key={s}
          variant={activeStatus === s ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onStatusChange(activeStatus === s ? null : s)}
        >
          {statusLabels[s]}
        </Badge>
      ))}

      {platforms.length > 0 && (
        <>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground text-sm font-medium">
            Platform:
          </span>
          {platforms.map((p) => (
            <Badge
              key={p}
              variant={activePlatform === p ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => onPlatformChange(activePlatform === p ? null : p)}
            >
              {p}
            </Badge>
          ))}
        </>
      )}

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onStatusChange(null);
            onPlatformChange(null);
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
