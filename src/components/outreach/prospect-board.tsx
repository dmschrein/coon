"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  prospectStatusValues,
  type ProspectStatus,
} from "@/lib/validations/prospect";
import type { Prospect } from "@/hooks/use-prospects";
import type { RecentContent } from "@/hooks/use-growth";
import { ProspectColumn } from "./prospect-column";
import { ProspectCard } from "./prospect-card";

interface ProspectBoardProps {
  prospects: Prospect[];
  onStatusChange: (id: string, status: ProspectStatus) => void;
  onDraftMessage: (prospect: Prospect) => void;
  onMarkJoined?: (prospect: Prospect, contentId: string) => void;
  recentContent?: RecentContent[];
}

const columns: { status: ProspectStatus; label: string }[] = [
  { status: "cold", label: "Cold" },
  { status: "contacted", label: "Contacted" },
  { status: "responded", label: "Responded" },
  { status: "joined", label: "Joined" },
  { status: "declined", label: "Declined" },
];

const statusSet = new Set<string>(prospectStatusValues);

export function ProspectBoard({
  prospects,
  onStatusChange,
  onDraftMessage,
  onMarkJoined,
  recentContent,
}: ProspectBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemsByColumn = useMemo(() => {
    const map: Record<ProspectStatus, Prospect[]> = {
      cold: [],
      contacted: [],
      responded: [],
      joined: [],
      declined: [],
    };
    for (const p of prospects) {
      if (map[p.status]) map[p.status].push(p);
    }
    return map;
  }, [prospects]);

  const activeProspect = activeId
    ? prospects.find((p) => p.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const targetColumn = String(over.id);
    if (!statusSet.has(targetColumn)) return;

    const itemId = String(active.id);
    const prospect = prospects.find((p) => p.id === itemId);
    if (!prospect) return;
    if (prospect.status === targetColumn) return;

    onStatusChange(itemId, targetColumn as ProspectStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <ProspectColumn
            key={col.status}
            status={col.status}
            label={col.label}
            items={itemsByColumn[col.status]}
            onDraftMessage={onDraftMessage}
            onMarkJoined={onMarkJoined}
            recentContent={recentContent}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProspect ? (
          <ProspectCard
            prospect={activeProspect}
            onDraftMessage={() => {}}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
