"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ContentApprovalStatus } from "@/types";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkAction: (status: ContentApprovalStatus) => void;
  isLoading: boolean;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
  onBulkAction,
  isLoading,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-background fixed right-0 bottom-0 left-0 z-50 flex items-center justify-between border-t p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) =>
            checked ? onSelectAll() : onDeselectAll()
          }
        />
        <span className="text-sm font-medium">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onBulkAction("approved")}
          disabled={isLoading}
        >
          Approve All
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onBulkAction("needs_revision")}
          disabled={isLoading}
        >
          Request Revision
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onBulkAction("rejected")}
          disabled={isLoading}
        >
          Reject All
        </Button>
        <Button size="sm" variant="ghost" onClick={onDeselectAll}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
