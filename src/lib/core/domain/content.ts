/**
 * CampaignContent Domain Entity - Pure business logic for platform content.
 *
 * Tracks per-platform content generation state within a campaign.
 * Zero external dependencies.
 */

import type {
  CampaignPlatform,
  CampaignContentStatus,
  ContentApprovalStatus,
} from "@/types";

export class CampaignContentEntity {
  constructor(
    public readonly id: string,
    public readonly campaignId: string,
    public readonly userId: string,
    public readonly platform: CampaignPlatform,
    public status: CampaignContentStatus,
    public contentData: unknown | null,
    public tokensUsed: number | null,
    public errorMessage: string | null,
    public readonly createdAt: Date,
    public approvalStatus: ContentApprovalStatus = "pending_review",
    public title: string | null = null,
    public pillar: string | null = null,
    public body: string | null = null,
    public scheduledFor: Date | null = null,
    public enrichments: unknown | null = null
  ) {}

  hasMedia(): boolean {
    if (!this.enrichments) return false;
    const e = this.enrichments as Record<string, unknown>;
    const media = e.media as { assets?: unknown[] } | undefined;
    return !!media?.assets?.length;
  }

  isPending(): boolean {
    return this.status === "pending";
  }

  isGenerating(): boolean {
    return this.status === "generating";
  }

  isComplete(): boolean {
    return this.status === "complete";
  }

  isFailed(): boolean {
    return this.status === "failed";
  }

  isPendingReview(): boolean {
    return this.approvalStatus === "pending_review";
  }

  isApproved(): boolean {
    return this.approvalStatus === "approved";
  }

  isRejected(): boolean {
    return this.approvalStatus === "rejected";
  }

  needsRevision(): boolean {
    return this.approvalStatus === "needs_revision";
  }

  canRetry(): boolean {
    return this.status === "failed" || this.status === "pending";
  }

  markGenerating(): void {
    if (!this.canRetry()) {
      throw new ContentStateError(
        `Cannot start generation in status: ${this.status}`
      );
    }
    this.status = "generating";
    this.errorMessage = null;
  }

  markComplete(contentData: unknown, tokensUsed: number): void {
    this.status = "complete";
    this.contentData = contentData;
    this.tokensUsed = tokensUsed;
    this.errorMessage = null;
  }

  markFailed(errorMessage: string): void {
    this.status = "failed";
    this.errorMessage = errorMessage;
  }

  setApprovalStatus(status: ContentApprovalStatus): void {
    this.approvalStatus = status;
  }

  static create(params: {
    id: string;
    campaignId: string;
    userId: string;
    platform: CampaignPlatform;
    title?: string;
    pillar?: string;
  }): CampaignContentEntity {
    return new CampaignContentEntity(
      params.id,
      params.campaignId,
      params.userId,
      params.platform,
      "pending",
      null,
      null,
      null,
      new Date(),
      "pending_review",
      params.title ?? null,
      params.pillar ?? null,
      null,
      null,
      null
    );
  }
}

export class ContentStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentStateError";
  }
}
