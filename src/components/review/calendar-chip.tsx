"use client";

import { cn } from "@/lib/utils";
import type { ReviewBoardColumn } from "@/types";

interface CalendarChipProps {
  contentType: string | null;
  pillar: string | null;
  boardColumn: ReviewBoardColumn;
  onClick: () => void;
}

const statusColors: Record<ReviewBoardColumn, string> = {
  pending_review: "bg-gray-200 text-gray-700",
  approved: "bg-green-200 text-green-800",
  scheduled: "bg-blue-200 text-blue-800",
  posted: "bg-purple-200 text-purple-800",
};

export function CalendarChip({
  contentType,
  pillar,
  boardColumn,
  onClick,
}: CalendarChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium",
        "cursor-pointer transition-opacity hover:opacity-80",
        statusColors[boardColumn]
      )}
      onClick={onClick}
      title={`${contentType ?? "Post"}${pillar ? ` — ${pillar}` : ""}`}
    >
      {contentType ?? "Post"}
      {pillar && <span className="ml-1 opacity-70">· {pillar}</span>}
    </button>
  );
}
