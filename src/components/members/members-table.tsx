"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, ArrowUpDown, Globe, Users } from "lucide-react";
import type { Member } from "@/hooks/use-members";

export type MembersSortKey = "engagementCount" | "lastSeenAt";
export type SortDirection = "asc" | "desc";

interface MembersTableProps {
  members: Member[];
  isLoading: boolean;
  sortKey: MembersSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: MembersSortKey) => void;
  onRowClick: (member: Member) => void;
  selectedId: string | null;
}

const statusVariant: Record<
  string,
  { variant: "default" | "secondary" | "outline"; className?: string }
> = {
  prospect: { variant: "outline" },
  member: { variant: "secondary" },
  advocate: {
    variant: "default",
    className: "bg-green-600 hover:bg-green-600/90",
  },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function MembersTable({
  members,
  isLoading,
  sortKey,
  sortDirection,
  onSortChange,
  onRowClick,
  selectedId,
}: MembersTableProps) {
  const sorted = useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "engagementCount") {
        cmp = a.engagementCount - b.engagementCount;
      } else if (sortKey === "lastSeenAt") {
        cmp =
          new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime();
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [members, sortKey, sortDirection]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-16 text-center">
        <Users className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">No members yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Handle</th>
            <th className="px-4 py-3 text-left font-medium">Platform</th>
            <SortableHeader
              label="Engagement"
              active={sortKey === "engagementCount"}
              direction={sortDirection}
              onClick={() => onSortChange("engagementCount")}
              align="right"
            />
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <SortableHeader
              label="Last Seen"
              active={sortKey === "lastSeenAt"}
              direction={sortDirection}
              onClick={() => onSortChange("lastSeenAt")}
              align="left"
            />
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((member) => {
            const status = statusVariant[member.status] ?? statusVariant.member;
            const isSelected = selectedId === member.id;
            return (
              <tr
                key={member.id}
                onClick={() => onRowClick(member)}
                className={cn(
                  "hover:bg-muted/50 cursor-pointer border-t transition-colors",
                  isSelected && "bg-muted"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">@{member.username}</span>
                    {member.displayName && (
                      <span className="text-muted-foreground text-xs">
                        {member.displayName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Globe className="text-muted-foreground h-4 w-4" />
                    <span className="capitalize">{member.platform}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {member.engagementCount}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={status.variant}
                    className={cn("capitalize", status.className)}
                  >
                    {member.status}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {formatRelativeTime(member.lastSeenAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-muted-foreground text-xs">View</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align: "left" | "right";
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
  align,
}: SortableHeaderProps) {
  const Icon = !active
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1 transition-colors",
          active && "text-foreground"
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}
