"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MembershipTier } from "@/lib/validations/tier";
import {
  useDeleteTier,
  useGenerateTierCopy,
  useReorderTiers,
  useTiersList,
  useUpdateTier,
} from "@/hooks/use-tiers";
import { TierCard } from "./tier-card";
import { TierForm } from "./tier-form";

export function TierManager() {
  const { data: tiers, isLoading, error } = useTiersList();
  const updateTier = useUpdateTier();
  const deleteTier = useDeleteTier();
  const reorderTiers = useReorderTiers();
  const generateCopy = useGenerateTierCopy();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !tiers) return;
    if (active.id === over.id) return;

    const oldIndex = tiers.findIndex((t) => t.id === active.id);
    const newIndex = tiers.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = [...tiers];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);

    reorderTiers.mutate(
      next.map((t) => t.id),
      {
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleGenerateCopy = async (tier: MembershipTier) => {
    setGeneratingId(tier.id);
    try {
      const input = {
        audienceSummary:
          tier.description ??
          tier.tagline ??
          "Members of this community looking for premium support and resources.",
        communityName: tier.name,
        priceCents: tier.priceCents,
        billingCycle: tier.billingCycle as "monthly" | "yearly" | "one_time",
        tierGoal:
          tier.tagline ?? `Premium tier for committed members of ${tier.name}`,
      };
      const copy = await generateCopy.mutateAsync(input);
      await updateTier.mutateAsync({
        id: tier.id,
        patch: {
          name: copy.name,
          tagline: copy.tagline,
          description: copy.description,
          benefits: copy.benefits,
        },
      });
      toast.success("Copy generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this tier?")) {
      deleteTier.mutate(id, {
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleUpdatePaymentUrl = (tier: MembershipTier, url: string) => {
    updateTier.mutate(
      { id: tier.id, patch: { externalPaymentUrl: url || null } },
      {
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const activeTier = activeId ? tiers?.find((t) => t.id === activeId) : null;

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm">
        Failed to load tiers. Refresh to try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membership Tiers</h1>
          <p className="text-muted-foreground text-sm">
            Build your pricing page. Drag tiers to reorder.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>Add tier</Button>
      </header>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-96 w-80 shrink-0" />
          ))}
        </div>
      ) : (tiers?.length ?? 0) === 0 ? (
        <div className="bg-muted/30 rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No tiers yet. Add your first paid membership tier to get started.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={(tiers ?? []).map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {(tiers ?? []).map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  onGenerateCopy={() => handleGenerateCopy(tier)}
                  onEdit={() => setEditingTier(tier)}
                  onDelete={() => handleDelete(tier.id)}
                  onUpdatePaymentUrl={(url) =>
                    handleUpdatePaymentUrl(tier, url)
                  }
                  isGeneratingCopy={generatingId === tier.id}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTier ? (
              <TierCard
                tier={activeTier}
                onGenerateCopy={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                onUpdatePaymentUrl={() => {}}
                isGeneratingCopy={false}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TierForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />
      <TierForm
        open={!!editingTier}
        onOpenChange={(open) => !open && setEditingTier(null)}
        mode="edit"
        tier={editingTier}
      />
    </div>
  );
}
