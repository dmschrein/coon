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
import type {
  ContentApprovalStatus,
  CampaignPlatform,
  ReviewBoardColumn,
} from "@/types";

interface ContentItem {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  body: string | null;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
  boardColumn: ReviewBoardColumn;
  contentType?: string | null;
  aiConfidenceScore?: number | null;
  hasMedia?: boolean;
  overallScore?: number;
}

interface KanbanBoardProps {
  items: ContentItem[];
  onStatusChange: (id: string, status: ContentApprovalStatus) => void;
  onCardClick: (id: string) => void;
  onDragToSchedule: (id: string) => void;
}

const columns: { status: ReviewBoardColumn; label: string }[] = [
  { status: "pending_review", label: "Pending Review" },
  { status: "approved", label: "Approved" },
  { status: "scheduled", label: "Scheduled" },
  { status: "posted", label: "Posted" },
];

export function KanbanBoard({
  items,
  onStatusChange,
  onCardClick,
  onDragToSchedule,
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
      const targetColumn = String(over.id) as ReviewBoardColumn;

      if (!columns.some((c) => c.status === targetColumn)) return;

      const item = items.find((i) => i.id === itemId);
      if (!item || item.boardColumn === targetColumn) return;

      if (targetColumn === "scheduled") {
        onDragToSchedule(itemId);
      } else if (targetColumn === "approved") {
        onStatusChange(itemId, "approved");
      } else if (targetColumn === "pending_review") {
        onStatusChange(itemId, "pending_review");
      }
      // "posted" column is read-only — cannot drag into it
    },
    [items, onStatusChange, onDragToSchedule]
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
            items={items.filter((i) => i.boardColumn === col.status)}
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
