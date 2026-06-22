"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SponsorshipCard } from "./sponsorship-card";
import type { Sponsor, SponsorStatus } from "@/lib/validations/sponsor";

const statusColors: Record<SponsorStatus, string> = {
  outreach: "bg-slate-100 text-slate-800",
  negotiating: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  declined: "bg-rose-100 text-rose-800",
};

interface SponsorshipColumnProps {
  status: SponsorStatus;
  label: string;
  sponsors: Sponsor[];
  onDraftPitch: (sponsor: Sponsor) => void;
  onEdit: (sponsor: Sponsor) => void;
  onDelete: (id: string) => void;
  pitchingId: string | null;
}

export function SponsorshipColumn({
  status,
  label,
  sponsors,
  onDraftPitch,
  onEdit,
  onDelete,
  pitchingId,
}: SponsorshipColumnProps) {
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
          {sponsors.length}
        </Badge>
      </div>
      <ScrollArea className="max-h-[calc(100vh-300px)] min-h-[200px] flex-1 p-2">
        <SortableContext
          items={sponsors.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sponsors.map((sponsor) => (
            <SponsorshipCard
              key={sponsor.id}
              sponsor={sponsor}
              onDraftPitch={() => onDraftPitch(sponsor)}
              onEdit={() => onEdit(sponsor)}
              onDelete={() => onDelete(sponsor.id)}
              isPitching={pitchingId === sponsor.id}
            />
          ))}
          {sponsors.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-xs">
              Drop sponsors here
            </p>
          )}
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
