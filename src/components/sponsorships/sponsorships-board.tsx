"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  sponsorStatusValues,
  type Sponsor,
  type SponsorStatus,
} from "@/lib/validations/sponsor";
import {
  useDraftSponsorPitch,
  useDeleteSponsor,
  useSponsorsList,
  useUpdateSponsor,
} from "@/hooks/use-sponsors";
import { SponsorshipColumn } from "./sponsorship-column";
import { SponsorshipCard } from "./sponsorship-card";
import { SponsorshipForm } from "./sponsorship-form";
import { PitchModal } from "./pitch-modal";

const columns: { status: SponsorStatus; label: string }[] = [
  { status: "outreach", label: "Outreach" },
  { status: "negotiating", label: "Negotiating" },
  { status: "active", label: "Active" },
  { status: "completed", label: "Completed" },
  { status: "declined", label: "Declined" },
];

// Pure helper: extracted so it can be unit-tested without dispatching
// synthetic pointer events.
export function computeStatusChange(
  activeId: string,
  overId: string,
  sponsors: Sponsor[]
): { id: string; newStatus: SponsorStatus } | null {
  const isValidStatus = (sponsorStatusValues as readonly string[]).includes(
    overId
  );
  if (!isValidStatus) return null;
  const sponsor = sponsors.find((s) => s.id === activeId);
  if (!sponsor) return null;
  if (sponsor.status === overId) return null;
  return { id: activeId, newStatus: overId as SponsorStatus };
}

interface PitchState {
  sponsorId: string;
  subject: string;
  body: string;
  followUp: string;
}

export function SponsorshipsBoard() {
  const { data: sponsors, isLoading, error } = useSponsorsList();
  const updateSponsor = useUpdateSponsor();
  const deleteSponsor = useDeleteSponsor();
  const draftPitch = useDraftSponsorPitch();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pitchState, setPitchState] = useState<PitchState | null>(null);
  const [pitchError, setPitchError] = useState<string | null>(null);
  const [pitchingId, setPitchingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const pipelineValue = useMemo(() => {
    if (!sponsors) return 0;
    return sponsors
      .filter((s) => s.status === "negotiating" || s.status === "active")
      .reduce((sum, s) => sum + (s.dealValue ?? 0), 0);
  }, [sponsors]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !sponsors) return;

    const change = computeStatusChange(
      String(active.id),
      String(over.id),
      sponsors
    );
    if (!change) return;
    updateSponsor.mutate({
      id: change.id,
      patch: { status: change.newStatus },
    });
  };

  const handleDraftPitch = async (sponsor: Sponsor) => {
    setPitchError(null);
    setPitchingId(sponsor.id);
    try {
      const result = await draftPitch.mutateAsync(sponsor.id);
      setPitchState({
        sponsorId: sponsor.id,
        subject: result.subject,
        body: result.body,
        followUp: result.followUp,
      });
    } catch (err) {
      setPitchError(
        err instanceof Error ? err.message : "Failed to draft pitch"
      );
    } finally {
      setPitchingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this sponsor?")) {
      deleteSponsor.mutate(id);
    }
  };

  const activeSponsor = activeId
    ? sponsors?.find((s) => s.id === activeId)
    : null;

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm">
        Failed to load sponsors. Refresh to try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sponsorships</h1>
          <p className="text-muted-foreground text-sm">
            Pipeline value (negotiating + active):{" "}
            <span className="text-foreground font-semibold">
              {formatCurrency(pipelineValue)}
            </span>
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>Add sponsor</Button>
      </header>

      {pitchError && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-3 text-sm">
          {pitchError}
        </div>
      )}

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <Skeleton key={col.status} className="h-64 w-72 shrink-0" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => (
              <SponsorshipColumn
                key={col.status}
                status={col.status}
                label={col.label}
                sponsors={(sponsors ?? []).filter(
                  (s) => s.status === col.status
                )}
                onDraftPitch={handleDraftPitch}
                onEdit={setEditingSponsor}
                onDelete={handleDelete}
                pitchingId={pitchingId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeSponsor ? (
              <SponsorshipCard
                sponsor={activeSponsor}
                onDraftPitch={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                isPitching={false}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <SponsorshipForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />
      <SponsorshipForm
        open={!!editingSponsor}
        onOpenChange={(open) => !open && setEditingSponsor(null)}
        mode="edit"
        sponsor={editingSponsor}
      />
      <PitchModal
        open={!!pitchState}
        onOpenChange={(open) => !open && setPitchState(null)}
        pitch={pitchState}
      />
    </div>
  );
}
