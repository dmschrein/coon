/**
 * CampaignContent Domain Entity - Pure business logic for platform content.
 *
 * Tracks per-platform content generation state within a campaign.
 * Zero external dependencies.
 */

import type { CampaignPlatform, CampaignContentStatus } from "@/types";

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
    public readonly createdAt: Date
  ) {}

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

  static create(params: {
    id: string;
    campaignId: string;
    userId: string;
    platform: CampaignPlatform;
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
      new Date()
    );
  }
}

export class ContentStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentStateError";
  }
}
