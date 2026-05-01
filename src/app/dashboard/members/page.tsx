"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MembersTable } from "@/components/members/members-table";
import type {
  MembersSortKey,
  SortDirection,
} from "@/components/members/members-table";
import { MemberDetailSheet } from "@/components/members/member-detail-sheet";
import { useMembers, type Member } from "@/hooks/use-members";
import {
  memberStatusValues,
  type MemberStatus,
} from "@/lib/validations/member";

export default function MembersPage() {
  const [statusFilter, setStatusFilter] = useState<MemberStatus | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<MembersSortKey>("engagementCount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading } = useMembers({
    status: statusFilter ?? undefined,
    platform: platformFilter ?? undefined,
    limit: 100,
  });

  const members = useMemo(() => data?.items ?? [], [data?.items]);

  const platforms = useMemo(
    () => [...new Set(members.map((m) => m.platform))].sort(),
    [members]
  );

  const handleSortChange = (key: MembersSortKey) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const handleRowClick = (member: Member) => {
    setSelectedMember(member);
    setSheetOpen(true);
  };

  const selected =
    members.find((m) => m.id === selectedMember?.id) ?? selectedMember;

  const hasActiveFilter = statusFilter || platformFilter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground text-sm">
          Community members tracked across your campaigns
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">
          Status:
        </span>
        {memberStatusValues.map((s) => (
          <Badge
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
          >
            {s}
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
                variant={platformFilter === p ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() =>
                  setPlatformFilter(platformFilter === p ? null : p)
                }
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
              setStatusFilter(null);
              setPlatformFilter(null);
            }}
          >
            Clear
          </Button>
        )}

        <span className="text-muted-foreground ml-auto text-xs">
          {data?.total ?? 0} members
        </span>
      </div>

      <MembersTable
        members={members}
        isLoading={isLoading}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onRowClick={handleRowClick}
        selectedId={selected?.id ?? null}
      />

      <MemberDetailSheet
        member={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
