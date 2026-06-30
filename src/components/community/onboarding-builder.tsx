"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { GripVertical, Loader2, Rocket, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStepRow } from "./onboarding-step-row";
import {
  useOnboarding,
  useGenerateOnboarding,
  useSaveOnboarding,
  useActivateOnboarding,
} from "@/hooks/use-onboarding";
import { ONBOARDING_TIMINGS } from "@/lib/core/domain/onboarding-schedule";
import type { OnboardingStep } from "@/types";

type Row = OnboardingStep & { uid: string };

/** Re-derive step number + timing from list position (positions map to timings). */
function resequence(rows: Row[]): Row[] {
  return rows.map((row, i) => ({
    ...row,
    stepNumber: i + 1,
    triggerTiming: ONBOARDING_TIMINGS[i] ?? row.triggerTiming,
  }));
}

function SortableStepRow({
  row,
  onChange,
}: {
  row: Row;
  onChange: (patch: Partial<OnboardingStep>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <OnboardingStepRow
        step={row}
        onChange={onChange}
        dragHandle={
          <button
            type="button"
            aria-label="Drag to reorder"
            className="text-muted-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

export function OnboardingBuilder() {
  const { data: sequence, isLoading } = useOnboarding();
  const generate = useGenerateOnboarding();
  const save = useSaveOnboarding();
  const activate = useActivateOnboarding();
  const [rows, setRows] = useState<Row[]>([]);
  // Reset local rows whenever the server sequence reference changes (initial
  // load, regenerate, refetch) — the recommended "adjust state during render"
  // pattern, no effect required.
  const [syncedSequence, setSyncedSequence] = useState(sequence);
  if (sequence !== syncedSequence) {
    setSyncedSequence(sequence);
    setRows(
      (sequence?.steps ?? []).map((s, i) => ({ ...s, uid: s.id ?? `row-${i}` }))
    );
  }

  const sensors = useSensors(useSensor(PointerSensor));

  const handleGenerate = () => {
    generate.mutate(
      {},
      {
        onSuccess: () => toast.success("Onboarding sequence generated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleSave = () => {
    save.mutate(rows, {
      onSuccess: () => toast.success("Changes saved"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleActivate = async () => {
    // Persist edits/reorder first so the scheduled entries match what's on screen.
    try {
      await save.mutateAsync(rows);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save changes"
      );
      return;
    }
    activate.mutate(undefined, {
      onSuccess: (data) =>
        toast.success(`Sequence activated — ${data.scheduled} steps scheduled`),
      onError: (err) => toast.error(err.message),
    });
  };

  const busy = save.isPending || activate.isPending;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.uid === active.id);
      const newIndex = prev.findIndex((r) => r.uid === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return resequence(arrayMove(prev, oldIndex, newIndex));
    });
  };

  const updateRow = (uid: string, patch: Partial<OnboardingStep>) => {
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r))
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Onboarding Sequence</h2>
          <p className="text-muted-foreground text-sm">
            A 5-step welcome flow that turns new members into contributors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {rows.length > 0 ? "Regenerate Sequence" : "Generate Sequence"}
          </Button>
          {rows.length > 0 && (
            <Button variant="outline" onClick={handleSave} disabled={busy}>
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          )}
          <Button onClick={handleActivate} disabled={busy || rows.length === 0}>
            {activate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Activate Sequence
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-12">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading onboarding sequence…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          No onboarding sequence yet. Generate one to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.uid)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {rows.map((row) => (
                <SortableStepRow
                  key={row.uid}
                  row={row}
                  onChange={(patch) => updateRow(row.uid, patch)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
