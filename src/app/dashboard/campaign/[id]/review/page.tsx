"use client";

import { use } from "react";
import { useReviewPage } from "@/hooks/use-review-page";
import { KanbanBoard } from "@/components/review/kanban-board";
import { CalendarView } from "@/components/review/calendar-view";
import { ContentCardExpanded } from "@/components/review/content-card-expanded";
import { FilterBar } from "@/components/review/filter-bar";
import { CohesionPanel } from "@/components/review/cohesion-panel";
import { BulkActionsBar } from "@/components/review/bulk-actions-bar";
import { ViewToggle } from "@/components/review/view-toggle";
import { SchedulePicker } from "@/components/review/schedule-picker";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";

export default function ReviewBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const review = useReviewPage(id);

  if (review.isLoading) {
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
              {review.campaignData?.campaign?.name ?? "Campaign"} —{" "}
              {review.items.length} content pieces
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle
            activeView={review.activeView}
            onViewChange={review.setActiveView}
          />
          <Button variant="outline" onClick={review.handleCohesionCheck}>
            <Wand2 className="mr-2 h-4 w-4" />
            Check Cohesion
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        platforms={review.platforms}
        pillars={review.pillars}
        contentTypes={review.contentTypes}
        activePlatform={review.activePlatform}
        activePillar={review.activePillar}
        activeStatus={review.activeStatus}
        activeContentType={review.activeContentType}
        onPlatformChange={review.setActivePlatform}
        onPillarChange={review.setActivePillar}
        onStatusChange={review.setActiveStatus}
        onContentTypeChange={review.setActiveContentType}
      />

      {/* Board or Calendar View */}
      {review.activeView === "board" ? (
        <KanbanBoard
          items={review.filteredItems}
          onStatusChange={review.handleStatusChange}
          onCardClick={review.setSelectedCard}
          onDragToSchedule={review.handleDragToSchedule}
        />
      ) : (
        <CalendarView
          items={review.filteredItems}
          platforms={review.platforms}
          onCardClick={review.setSelectedCard}
        />
      )}

      {/* Expanded Card Sheet */}
      {review.selectedItem && (
        <ContentCardExpanded
          open={!!review.selectedCard}
          onClose={() => review.setSelectedCard(null)}
          campaignId={id}
          {...review.selectedItem}
          onApprovalChange={review.handleStatusChange}
          onBodyUpdate={review.handleBodyUpdate}
          onHashtagsUpdate={review.handleHashtagsUpdate}
          onTargetCommunityUpdate={review.handleTargetCommunityUpdate}
          onRegenerate={review.handleRegenerate}
          onDelete={review.handleDelete}
          onSchedule={review.handleScheduleFromPanel}
          isRegenerating={review.isRegenerating}
        />
      )}

      {/* Schedule Picker Modal */}
      <SchedulePicker
        open={!!review.scheduleTarget}
        onClose={() => review.setScheduleTarget(null)}
        onConfirm={review.handleScheduleConfirm}
      />

      {/* Cohesion Panel */}
      <CohesionPanel
        open={review.cohesionOpen}
        onClose={() => review.setCohesionOpen(false)}
        result={review.cohesionResult}
        isLoading={review.isCohesionLoading}
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={review.selectedIds.size}
        totalCount={review.items.length}
        allSelected={
          review.selectedIds.size === review.items.length &&
          review.items.length > 0
        }
        onSelectAll={() =>
          review.setSelectedIds(new Set(review.items.map((i) => i.id)))
        }
        onDeselectAll={() => review.setSelectedIds(new Set())}
        onBulkAction={review.handleBulkAction}
        onBulkSchedule={review.handleBulkSchedule}
        onBulkRegenerate={review.handleBulkRegenerate}
        isLoading={review.isBulkLoading}
        isRegenerating={review.isRegenerating}
      />
    </div>
  );
}
