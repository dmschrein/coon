"use client";

import { use, useState, useCallback, useMemo } from "react";
import {
  useCampaign,
  useCampaignContent,
  useUpdateContent,
} from "@/hooks/use-campaign";
import {
  useBulkUpdateApproval,
  useCohesionCheck,
} from "@/hooks/use-review-board";
import { KanbanBoard } from "@/components/review/kanban-board";
import { ContentCardExpanded } from "@/components/review/content-card-expanded";
import { FilterBar } from "@/components/review/filter-bar";
import { CohesionPanel } from "@/components/review/cohesion-panel";
import { BulkActionsBar } from "@/components/review/bulk-actions-bar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";
import type { ContentApprovalStatus, CampaignPlatform } from "@/types";
import type { CohesionCheckResult } from "@/lib/agents/cohesion-checker";

export default function ReviewBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: campaignData, isLoading: campaignLoading } = useCampaign(id);
  const { data: content, isLoading: contentLoading } = useCampaignContent(id);
  const updateContent = useUpdateContent(id);
  const bulkUpdate = useBulkUpdateApproval(id);
  const cohesionCheck = useCohesionCheck(id);

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cohesionOpen, setCohesionOpen] = useState(false);
  const [cohesionResult, setCohesionResult] =
    useState<CohesionCheckResult | null>(null);

  // Filters
  const [activePlatform, setActivePlatform] = useState<CampaignPlatform | null>(
    null
  );
  const [activePillar, setActivePillar] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] =
    useState<ContentApprovalStatus | null>(null);

  const items = useMemo(() => {
    if (!content) return [];
    return content
      .filter((c: { status: string }) => c.status === "complete")
      .map(
        (c: {
          id: string;
          platform: CampaignPlatform;
          title: string | null;
          pillar: string | null;
          body: string | null;
          scheduledFor: string | null;
          approvalStatus: ContentApprovalStatus;
        }) => ({
          id: c.id,
          platform: c.platform,
          title: c.title,
          pillar: c.pillar,
          body: c.body,
          scheduledFor: c.scheduledFor ? new Date(c.scheduledFor) : null,
          approvalStatus: c.approvalStatus ?? "pending_review",
        })
      );
  }, [content]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activePlatform && item.platform !== activePlatform) return false;
      if (activePillar && item.pillar !== activePillar) return false;
      if (activeStatus && item.approvalStatus !== activeStatus) return false;
      return true;
    });
  }, [items, activePlatform, activePillar, activeStatus]);

  const platforms = useMemo(
    () => [...new Set(items.map((i) => i.platform))],
    [items]
  );
  const pillars = useMemo(
    () => [...new Set(items.map((i) => i.pillar).filter(Boolean))] as string[],
    [items]
  );

  const handleStatusChange = useCallback(
    (contentId: string, status: ContentApprovalStatus) => {
      updateContent.mutate({ contentId, approvalStatus: status });
    },
    [updateContent]
  );

  const handleBodyUpdate = useCallback(
    (contentId: string, body: string) => {
      updateContent.mutate({ contentId, body });
    },
    [updateContent]
  );

  const handleBulkAction = useCallback(
    (status: ContentApprovalStatus) => {
      bulkUpdate.mutate(
        { contentIds: [...selectedIds], approvalStatus: status },
        { onSuccess: () => setSelectedIds(new Set()) }
      );
    },
    [bulkUpdate, selectedIds]
  );

  const handleCohesionCheck = useCallback(async () => {
    setCohesionOpen(true);
    try {
      const result = await cohesionCheck.mutateAsync();
      setCohesionResult(result);
    } catch {
      // Error handled by mutation
    }
  }, [cohesionCheck]);

  const selectedItem = selectedCard
    ? items.find((i) => i.id === selectedCard)
    : null;

  if (campaignLoading || contentLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/campaign/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Review Board</h1>
            <p className="text-muted-foreground text-sm">
              {campaignData?.campaign?.name ?? "Campaign"} — {items.length}{" "}
              content pieces
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleCohesionCheck}>
          <Wand2 className="mr-2 h-4 w-4" />
          Check Cohesion
        </Button>
      </div>

      {/* Filters */}
      <FilterBar
        platforms={platforms}
        pillars={pillars}
        activePlatform={activePlatform}
        activePillar={activePillar}
        activeStatus={activeStatus}
        onPlatformChange={setActivePlatform}
        onPillarChange={setActivePillar}
        onStatusChange={setActiveStatus}
      />

      {/* Kanban Board */}
      <KanbanBoard
        items={filteredItems}
        onStatusChange={handleStatusChange}
        onCardClick={setSelectedCard}
      />

      {/* Expanded Card Sheet */}
      {selectedItem && (
        <ContentCardExpanded
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          {...selectedItem}
          onApprovalChange={handleStatusChange}
          onBodyUpdate={handleBodyUpdate}
        />
      )}

      {/* Cohesion Panel */}
      <CohesionPanel
        open={cohesionOpen}
        onClose={() => setCohesionOpen(false)}
        result={cohesionResult}
        isLoading={cohesionCheck.isPending}
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={items.length}
        allSelected={selectedIds.size === items.length && items.length > 0}
        onSelectAll={() => setSelectedIds(new Set(items.map((i) => i.id)))}
        onDeselectAll={() => setSelectedIds(new Set())}
        onBulkAction={handleBulkAction}
        isLoading={bulkUpdate.isPending}
      />
    </div>
  );
}
