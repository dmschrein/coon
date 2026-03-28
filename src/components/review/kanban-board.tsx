"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { ContentCard } from "./content-card";
import type { ContentApprovalStatus, CampaignPlatform } from "@/types";

interface ContentItem {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  body: string | null;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
  hasMedia?: boolean;
  overallScore?: number;
}

interface KanbanBoardProps {
  items: ContentItem[];
  onStatusChange: (id: string, status: ContentApprovalStatus) => void;
  onCardClick: (id: string) => void;
}

const columns: { status: ContentApprovalStatus; label: string }[] = [
  { status: "pending_review", label: "Pending Review" },
  { status: "needs_revision", label: "Needs Revision" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

export function KanbanBoard({
  items,
  onStatusChange,
  onCardClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const itemId = String(active.id);
      const targetStatus = String(over.id) as ContentApprovalStatus;

      // Check if dropped on a column (over.id is a status string)
      if (columns.some((c) => c.status === targetStatus)) {
        const item = items.find((i) => i.id === itemId);
        if (item && item.approvalStatus !== targetStatus) {
          onStatusChange(itemId, targetStatus);
        }
      }
    },
    [items, onStatusChange]
  );

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            items={items.filter((i) => i.approvalStatus === col.status)}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem && <ContentCard {...activeItem} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
