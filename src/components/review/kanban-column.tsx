"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ContentCard } from "./content-card";
import type { ContentApprovalStatus, CampaignPlatform } from "@/types";

interface ContentItem {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
}

interface KanbanColumnProps {
  status: ContentApprovalStatus;
  label: string;
  items: ContentItem[];
  onCardClick: (id: string) => void;
}

const statusColors: Record<ContentApprovalStatus, string> = {
  pending_review: "bg-yellow-100 text-yellow-800",
  needs_revision: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function KanbanColumn({
  status,
  label,
  items,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`bg-muted/30 flex w-72 shrink-0 flex-col rounded-lg border ${
        isOver ? "ring-primary/50 ring-2" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge className={statusColors[status]} variant="secondary">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="max-h-[calc(100vh-300px)] min-h-[200px] flex-1 p-2">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <ContentCard
              key={item.id}
              {...item}
              onClick={() => onCardClick(item.id)}
            />
          ))}
          {items.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-xs">
              Drop items here
            </p>
          )}
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
