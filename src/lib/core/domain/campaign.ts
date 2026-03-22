/**
 * Campaign Domain Entity - Pure business logic, zero external dependencies.
 *
 * Encapsulates the rules and state transitions for campaigns.
 * Testable without database, API, or framework dependencies.
 */

import type {
  CampaignPlatform,
  CampaignStatus,
  CampaignStrategy,
  CampaignCalendar,
} from "@/types";

export class Campaign {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public name: string | null,
    public status: CampaignStatus,
    public readonly selectedPlatforms: CampaignPlatform[],
    public completedPlatforms: CampaignPlatform[],
    public strategy: CampaignStrategy | null,
    public calendar: CampaignCalendar | null,
    public totalTokensUsed: number,
    public readonly audienceProfileId: string | null,
    public readonly quizResponseId: string | null,
    public readonly createdAt: Date
  ) {}

  canGenerateStrategy(): boolean {
    return this.status === "strategy_pending";
  }

  canGenerateCalendar(): boolean {
    return this.status === "strategy_complete" && this.strategy !== null;
  }

  canGenerateContent(): boolean {
    return (
      (this.status === "calendar_complete" ||
        this.status === "generating_content") &&
      this.strategy !== null
    );
  }

  isComplete(): boolean {
    return this.status === "complete";
  }

  isFailed(): boolean {
    return this.status === "failed";
  }

  getRemainingPlatforms(): CampaignPlatform[] {
    return this.selectedPlatforms.filter(
      (p) => !this.completedPlatforms.includes(p)
    );
  }

  getProgress(): number {
    if (this.selectedPlatforms.length === 0) return 0;
    return this.completedPlatforms.length / this.selectedPlatforms.length;
  }

  setStrategy(strategy: CampaignStrategy, tokensUsed: number): void {
    if (!this.canGenerateStrategy()) {
      throw new CampaignStateError(
        `Cannot set strategy in status: ${this.status}`
      );
    }
    this.strategy = strategy;
    this.name = strategy.campaignName;
    this.status = "strategy_complete";
    this.totalTokensUsed += tokensUsed;
  }

  setCalendar(calendar: CampaignCalendar, tokensUsed: number): void {
    if (!this.canGenerateCalendar()) {
      throw new CampaignStateError(
        `Cannot set calendar in status: ${this.status}`
      );
    }
    this.calendar = calendar;
    this.status = "calendar_complete";
    this.totalTokensUsed += tokensUsed;
  }

  markContentGenerating(): void {
    if (!this.canGenerateContent()) {
      throw new CampaignStateError(
        `Cannot start content generation in status: ${this.status}`
      );
    }
    this.status = "generating_content";
  }

  addCompletedPlatform(platform: CampaignPlatform, tokensUsed: number): void {
    if (!this.selectedPlatforms.includes(platform)) {
      throw new CampaignStateError(
        `Platform ${platform} is not in this campaign`
      );
    }
    if (!this.completedPlatforms.includes(platform)) {
      this.completedPlatforms.push(platform);
    }
    this.totalTokensUsed += tokensUsed;

    // Check if all platforms are done
    if (this.getRemainingPlatforms().length === 0) {
      this.status = "complete";
    }
  }

  markFailed(): void {
    this.status = "failed";
  }

  /**
   * Create a new Campaign in its initial state.
   */
  static create(params: {
    id: string;
    userId: string;
    selectedPlatforms: CampaignPlatform[];
    audienceProfileId: string;
    quizResponseId: string;
  }): Campaign {
    return new Campaign(
      params.id,
      params.userId,
      null,
      "strategy_pending",
      params.selectedPlatforms,
      [],
      null,
      null,
      0,
      params.audienceProfileId,
      params.quizResponseId,
      new Date()
    );
  }
}

export class CampaignStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignStateError";
  }
}
