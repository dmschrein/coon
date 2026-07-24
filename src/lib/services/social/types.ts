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

export interface CommentAuthor {
  platformUserId: string;
  username: string;
  displayName?: string;
}

export interface PlatformEngagement {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  engagementRate: string | null;
  recordedAt: Date;
  commentAuthors?: CommentAuthor[];
}

export class AuthExpiredError extends Error {
  constructor(message = "Access token has expired") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

export class RateLimitError extends Error {
  /** Seconds to wait before retrying, parsed from the Retry-After header. */
  retryAfter?: number;

  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
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
  post(
    accessToken: string,
    payload: PostPayload,
    accountMetadata?: Record<string, unknown> | null
  ): Promise<PostResult>;
  getAccountInfo(accessToken: string): Promise<{
    accountId: string;
    accountName: string;
    profileImageUrl?: string;
  }>;
  getAuthUrl(
    redirectUri: string,
    state: string,
    codeChallenge?: string
  ): string;
  exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    accountId: string;
    accountName: string;
    profileImageUrl?: string;
    scopes?: string[];
    metadata?: Record<string, unknown>;
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
