/**
 * Social Platform Adapter Types - Shared interface for platform posting.
 */

import type { SocialPlatform } from "@/types";

export interface PostPayload {
  title?: string;
  body: string;
  hashtags?: string[];
  mediaUrls?: string[];
  subreddit?: string;
  communityTarget?: string;
}

export interface PostResult {
  externalPostId: string;
  externalPostUrl: string;
}

export interface PlatformEngagement {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  engagementRate: string | null;
  recordedAt: Date;
}

export class AuthExpiredError extends Error {
  constructor(message = "Access token has expired") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class NotImplementedError extends Error {
  constructor(platform: string, method: string) {
    super(`${method} is not yet implemented for ${platform}`);
    this.name = "NotImplementedError";
  }
}

export interface SocialPlatformAdapter {
  platform: SocialPlatform;
  post(accessToken: string, payload: PostPayload): Promise<PostResult>;
  getAccountInfo(accessToken: string): Promise<{
    accountId: string;
    accountName: string;
    profileImageUrl?: string;
  }>;
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    accountId: string;
    accountName: string;
    profileImageUrl?: string;
    scopes?: string[];
  }>;
  refreshAccessToken?(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
  fetchEngagement?(
    postId: string,
    accessToken: string
  ): Promise<PlatformEngagement | null>;
}
