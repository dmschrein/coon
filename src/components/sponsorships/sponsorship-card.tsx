"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Sponsor } from "@/lib/validations/sponsor";

const MS_PER_DAY = 86_400_000;

interface SponsorshipCardProps {
  sponsor: Sponsor;
  onDraftPitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPitching: boolean;
}

function daysInPipeline(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / MS_PER_DAY));
}

export function SponsorshipCard({
  sponsor,
  onDraftPitch,
  onEdit,
  onDelete,
  isPitching,
}: SponsorshipCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sponsor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const days = daysInPipeline(sponsor.createdAt);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="mb-2 cursor-grab p-3 active:cursor-grabbing"
    >
      <div {...attributes} {...listeners} className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm leading-tight font-semibold">
            {sponsor.companyName}
          </h4>
          <span className="text-muted-foreground text-xs">
            {sponsor.dealValue != null
              ? formatCurrency(sponsor.dealValue)
              : "—"}
          </span>
        </div>
        {sponsor.contactName && (
          <p className="text-muted-foreground text-xs">{sponsor.contactName}</p>
        )}
        <p className="text-muted-foreground text-xs">
          {days} {days === 1 ? "day" : "days"} in pipeline
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={onDraftPitch}
          disabled={isPitching}
          className="h-7 text-xs"
        >
          {isPitching ? "Drafting…" : "Draft Pitch"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-7 text-xs"
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-destructive h-7 text-xs"
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
