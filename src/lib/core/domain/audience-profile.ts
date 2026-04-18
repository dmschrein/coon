/**
 * AudienceProfile Domain Entity - Pure business logic for audience profiles.
 *
 * Encapsulates profile lifecycle and validation rules.
 * Zero external dependencies.
 */

import type {
  AudienceProfile as AudienceProfileData,
  ConfidenceLevel,
  Persona,
} from "@/types";

export class AudienceProfileEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly quizResponseId: string | null,
    public profileData: AudienceProfileData,
    public confidenceLevel: ConfidenceLevel,
    public analyticsData: Record<string, unknown> | null,
    public isActive: boolean,
    public readonly generatedAt: Date
  ) {}

  getPersonas(): Persona[] {
    return this.profileData.primaryPersonas;
  }

  getPersonaCount(): number {
    return this.profileData.primaryPersonas.length;
  }

  getKeywords(): string[] {
    return this.profileData.keywords;
  }

  getHashtags(): string[] {
    return this.profileData.hashtags;
  }

  hasValidData(): boolean {
    return (
      this.profileData.primaryPersonas.length > 0 &&
      this.profileData.keywords.length > 0 &&
      this.profileData.demographics !== undefined
    );
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }

  getAgeRange(): [number, number] {
    return this.profileData.demographics.ageRange;
  }

  getTopPainPoints(): string[] {
    return this.profileData.primaryPersonas.flatMap((p) => p.painPoints);
  }

  getConfidenceLevel(): ConfidenceLevel {
    return this.confidenceLevel;
  }

  hasAnalyticsData(): boolean {
    return this.analyticsData !== null;
  }

  static create(params: {
    id: string;
    userId: string;
    quizResponseId: string;
    profileData: AudienceProfileData;
  }): AudienceProfileEntity {
    return new AudienceProfileEntity(
      params.id,
      params.userId,
      params.quizResponseId,
      params.profileData,
      "quiz_based",
      null,
      true,
      new Date()
    );
  }
}
