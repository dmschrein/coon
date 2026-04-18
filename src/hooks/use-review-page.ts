import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  useCampaign,
  useCampaignContent,
  useUpdateContent,
} from "@/hooks/use-campaign";
import {
  useBulkUpdateApproval,
  useCohesionQuery,
  useCohesionCheck,
  useDeleteContent,
  useRegenerateContent,
  useBulkSchedule,
  useBulkRegenerate,
} from "@/hooks/use-review-board";
import type {
  ContentApprovalStatus,
  CampaignPlatform,
  ContentEnrichments,
  ReviewBoardColumn,
  CohesionCheckResult,
} from "@/types";
import { toast } from "sonner";

export interface ReviewItem {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  body: string | null;
  contentData: unknown;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
  boardColumn: ReviewBoardColumn;
  contentType: string | null;
  aiConfidenceScore: number | null;
  hashtags: string[];
  targetCommunity: string | null;
  enrichments: ContentEnrichments | null;
  hasMedia: boolean;
  overallScore: number | undefined;
}

function computeBoardColumn(
  approvalStatus: ContentApprovalStatus,
  scheduledFor: string | null,
  postedAt: string | null
): ReviewBoardColumn {
  if (postedAt) return "posted";
  if (approvalStatus === "approved" && scheduledFor) return "scheduled";
  if (approvalStatus === "approved") return "approved";
  return "pending_review";
}

function extractContentType(
  platform: string,
  contentData: unknown
): string | null {
  if (!contentData || typeof contentData !== "object") return null;
  const data = contentData as Record<string, unknown>;
  // Instagram has contentType field
  if (data.contentType && typeof data.contentType === "string") {
    return data.contentType;
  }
  // Thread-based platforms
  if (data.tweets || data.threadSeparated) return "thread";
  // Blog
  if (data.bodyMarkdown) return "article";
  // TikTok / YouTube
  if (data.scriptBody || data.script) return "video";
  // Email
  if (data.subjectLine) return "article";
  return "post";
}

export function useReviewPage(campaignId: string) {
  const { data: campaignData, isLoading: campaignLoading } =
    useCampaign(campaignId);
  const {
    data: content,
    isLoading: contentLoading,
    dataUpdatedAt,
  } = useCampaignContent(campaignId);
  const updateContent = useUpdateContent(campaignId);
  const bulkUpdate = useBulkUpdateApproval(campaignId);
  const cohesionQuery = useCohesionQuery(campaignId);
  const cohesionCheck = useCohesionCheck(campaignId);
  const deleteContent = useDeleteContent(campaignId);
  const regenerateContent = useRegenerateContent(campaignId);
  const bulkSchedule = useBulkSchedule(campaignId);
  const bulkRegenerate = useBulkRegenerate(campaignId);

  // UI state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cohesionOpen, setCohesionOpen] = useState(false);
  const [activeView, setActiveView] = useState<"board" | "calendar">("board");

  // Schedule picker state
  const [scheduleTarget, setScheduleTarget] = useState<{
    type: "single" | "bulk";
    contentId?: string;
  } | null>(null);

  // Filters
  const [activePlatform, setActivePlatform] = useState<CampaignPlatform | null>(
    null
  );
  const [activePillar, setActivePillar] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<ReviewBoardColumn | null>(
    null
  );
  const [activeContentType, setActiveContentType] = useState<string | null>(
    null
  );

  // Cohesion result from query or mutation
  const cohesionResult: CohesionCheckResult | null =
    cohesionCheck.data?.result ?? cohesionQuery.data?.result ?? null;

  // Auto-run cohesion check on initial load
  const hasAutoRun = useRef(false);
  useEffect(() => {
    if (
      hasAutoRun.current ||
      contentLoading ||
      !content?.length ||
      cohesionCheck.isPending
    ) {
      return;
    }

    // If no cached result, auto-run
    if (cohesionQuery.data && !cohesionQuery.data.result) {
      hasAutoRun.current = true;
      cohesionCheck.mutate();
    }
  }, [content, contentLoading, cohesionQuery.data, cohesionCheck]);

  // Process items
  const items: ReviewItem[] = useMemo(() => {
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
          postedAt: string | null;
          approvalStatus: ContentApprovalStatus;
          contentData: unknown;
          mediaSuggestions: ContentEnrichments | null;
          aiConfidenceScore: number | null;
          hashtags: string[] | null;
          targetCommunity: string | null;
        }) => ({
          id: c.id,
          platform: c.platform,
          title: c.title,
          pillar: c.pillar,
          body: c.body,
          contentData: c.contentData ?? null,
          scheduledFor: c.scheduledFor ? new Date(c.scheduledFor) : null,
          approvalStatus: c.approvalStatus ?? "pending_review",
          boardColumn: computeBoardColumn(
            c.approvalStatus ?? "pending_review",
            c.scheduledFor,
            c.postedAt
          ),
          contentType: extractContentType(c.platform, c.contentData),
          aiConfidenceScore: c.aiConfidenceScore ?? null,
          hashtags: c.hashtags ?? [],
          targetCommunity: c.targetCommunity ?? null,
          enrichments: c.mediaSuggestions ?? null,
          hasMedia: !!c.mediaSuggestions?.media?.assets?.length,
          overallScore: c.mediaSuggestions?.scores?.overallScore,
        })
      );
  }, [content]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activePlatform && item.platform !== activePlatform) return false;
      if (activePillar && item.pillar !== activePillar) return false;
      if (activeStatus && item.boardColumn !== activeStatus) return false;
      if (activeContentType && item.contentType !== activeContentType)
        return false;
      return true;
    });
  }, [items, activePlatform, activePillar, activeStatus, activeContentType]);

  // Derived filter options
  const platforms = useMemo(
    (): CampaignPlatform[] => [...new Set(items.map((i) => i.platform))],
    [items]
  );
  const pillars = useMemo(
    (): string[] =>
      [...new Set(items.map((i) => i.pillar).filter(Boolean))] as string[],
    [items]
  );
  const contentTypes = useMemo(
    (): string[] =>
      [...new Set(items.map((i) => i.contentType).filter(Boolean))] as string[],
    [items]
  );

  const selectedItem = selectedCard
    ? items.find((i) => i.id === selectedCard)
    : null;

  // Handlers
  const handleStatusChange = useCallback(
    (contentId: string, status: ContentApprovalStatus) => {
      updateContent.mutate({ contentId, approvalStatus: status });
    },
    [updateContent]
  );

  const handleBodyUpdate = useCallback(
    (contentId: string, body: string) => {
      updateContent.mutate(
        { contentId, body },
        {
          onSuccess: () => {
            // Content changed — re-run cohesion check
            cohesionCheck.mutate();
          },
        }
      );
    },
    [updateContent, cohesionCheck]
  );

  const handleHashtagsUpdate = useCallback(
    (contentId: string, hashtags: string[]) => {
      updateContent.mutate({ contentId, hashtags });
    },
    [updateContent]
  );

  const handleTargetCommunityUpdate = useCallback(
    (contentId: string, targetCommunity: string) => {
      updateContent.mutate({ contentId, targetCommunity });
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
    cohesionCheck.mutate();
  }, [cohesionCheck]);

  const handleRecheck = useCallback(() => {
    cohesionCheck.mutate();
  }, [cohesionCheck]);

  const handleScrollToCard = useCallback((contentId: string) => {
    setSelectedCard(contentId);
  }, []);

  const handleDragToSchedule = useCallback((contentId: string) => {
    setScheduleTarget({ type: "single", contentId });
  }, []);

  const handleScheduleConfirm = useCallback(
    (date: Date) => {
      if (!scheduleTarget) return;

      if (scheduleTarget.type === "single" && scheduleTarget.contentId) {
        updateContent.mutate({
          contentId: scheduleTarget.contentId,
          scheduledFor: date.toISOString(),
          approvalStatus: "approved",
        });
      } else if (scheduleTarget.type === "bulk") {
        bulkSchedule.mutate(
          {
            contentIds: [...selectedIds],
            scheduledFor: date.toISOString(),
          },
          { onSuccess: () => setSelectedIds(new Set()) }
        );
      }
      setScheduleTarget(null);
    },
    [scheduleTarget, updateContent, bulkSchedule, selectedIds]
  );

  const handleRegenerate = useCallback(
    (contentId: string) => {
      regenerateContent.mutate(contentId, {
        onSuccess: () => {
          toast.success("Content regenerated!");
          // Content changed — re-run cohesion check
          cohesionCheck.mutate();
        },
        onError: () => toast.error("Failed to regenerate content"),
      });
    },
    [regenerateContent, cohesionCheck]
  );

  const handleDelete = useCallback(
    (contentId: string) => {
      deleteContent.mutate(contentId, {
        onSuccess: () => {
          toast.success("Content deleted");
          setSelectedCard(null);
        },
        onError: () => toast.error("Failed to delete content"),
      });
    },
    [deleteContent]
  );

  const handleBulkSchedule = useCallback(() => {
    setScheduleTarget({ type: "bulk" });
  }, []);

  const handleBulkRegenerate = useCallback(() => {
    bulkRegenerate.mutate([...selectedIds], {
      onSuccess: (data) => {
        toast.success(`Regenerated ${data.regenerated} items`);
        setSelectedIds(new Set());
        // Content changed — re-run cohesion check
        cohesionCheck.mutate();
      },
      onError: () => toast.error("Failed to regenerate"),
    });
  }, [bulkRegenerate, selectedIds, cohesionCheck]);

  const handleScheduleFromPanel = useCallback((contentId: string) => {
    setScheduleTarget({ type: "single", contentId });
  }, []);

  return {
    // Data
    campaignData,
    items,
    filteredItems,
    platforms,
    pillars,
    contentTypes,
    selectedItem,
    isLoading: campaignLoading || contentLoading,

    // UI state
    selectedCard,
    setSelectedCard,
    selectedIds,
    setSelectedIds,
    activeView,
    setActiveView,
    scheduleTarget,
    setScheduleTarget,
    cohesionOpen,
    setCohesionOpen,
    cohesionResult,

    // Filters
    activePlatform,
    setActivePlatform,
    activePillar,
    setActivePillar,
    activeStatus,
    setActiveStatus,
    activeContentType,
    setActiveContentType,

    // Handlers
    handleStatusChange,
    handleBodyUpdate,
    handleHashtagsUpdate,
    handleTargetCommunityUpdate,
    handleBulkAction,
    handleCohesionCheck,
    handleRecheck,
    handleScrollToCard,
    handleDragToSchedule,
    handleScheduleConfirm,
    handleRegenerate,
    handleDelete,
    handleBulkSchedule,
    handleBulkRegenerate,
    handleScheduleFromPanel,

    // Loading states
    isBulkLoading: bulkUpdate.isPending,
    isRegenerating: regenerateContent.isPending,
    isCohesionLoading: cohesionCheck.isPending,
  };
}
