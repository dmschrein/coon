"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ProspectStatus } from "@/lib/validations/prospect";
import type { Prospect } from "@/hooks/use-prospects";
import type { RecentContent } from "@/hooks/use-growth";
import { ProspectCard } from "./prospect-card";

interface ProspectColumnProps {
  status: ProspectStatus;
  label: string;
  items: Prospect[];
  onDraftMessage: (prospect: Prospect) => void;
  onMarkJoined?: (prospect: Prospect, contentId: string) => void;
  recentContent?: RecentContent[];
}

export function ProspectColumn({
  status,
  label,
  items,
  onDraftMessage,
  onMarkJoined,
  recentContent,
}: ProspectColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/30 flex w-72 shrink-0 flex-col rounded-lg border",
        isOver && "ring-primary/50 ring-2"
      )}
    >
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="max-h-[calc(100vh-280px)] min-h-[200px]">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 p-3">
            {items.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-xs">
                Drop prospects here
              </div>
            ) : (
              items.map((p) => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  onDraftMessage={onDraftMessage}
                  onMarkJoined={onMarkJoined}
                  recentContent={recentContent}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
