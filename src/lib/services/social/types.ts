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

export interface SocialPlatformAdapter {
  platform: SocialPlatform;
  post(accessToken: string, payload: PostPayload): Promise<PostResult>;
  getAccountInfo(accessToken: string): Promise<{
    accountId: string;
    accountName: string;
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
    scopes?: string[];
  }>;
  refreshAccessToken?(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
}
