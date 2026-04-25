/**
 * Mock Platform Adapter - Dev-only adapter for testing OAuth flows locally.
 *
 * Used when real platform credentials are not configured in development.
 * Simulates the full OAuth flow with fake tokens and user data.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import type { SocialPlatform } from "@/types";

const MOCK_PROFILES: Record<
  string,
  { accountName: string; profileImageUrl: string }
> = {
  reddit: {
    accountName: "MockRedditUser",
    profileImageUrl:
      "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
  },
  instagram: {
    accountName: "mock_insta_user",
    profileImageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
  },
};

export class MockAdapter implements SocialPlatformAdapter {
  platform: SocialPlatform;

  constructor(platform: SocialPlatform) {
    this.platform = platform;
  }

  getAuthUrl(redirectUri: string, state: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      state,
    });
    return `${baseUrl}/api/accounts/mock-authorize?${params.toString()}`;
  }

  async exchangeCode(_code: string, _redirectUri: string) {
    const profile = MOCK_PROFILES[this.platform] ?? MOCK_PROFILES.reddit;
    return {
      accessToken: `mock_access_${this.platform}_${Date.now()}`,
      refreshToken: `mock_refresh_${this.platform}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      accountId: `mock_${this.platform}_123`,
      accountName: profile.accountName,
      profileImageUrl: profile.profileImageUrl,
      scopes: ["identity", "read", "submit"],
    };
  }

  async refreshAccessToken(_refreshToken: string) {
    return {
      accessToken: `mock_access_${this.platform}_${Date.now()}`,
      refreshToken: `mock_refresh_${this.platform}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async getAccountInfo(_accessToken: string) {
    const profile = MOCK_PROFILES[this.platform] ?? MOCK_PROFILES.reddit;
    return {
      accountId: `mock_${this.platform}_123`,
      accountName: profile.accountName,
      profileImageUrl: profile.profileImageUrl,
    };
  }

  async post(_accessToken: string, payload: PostPayload): Promise<PostResult> {
    console.log(`[MockAdapter:${this.platform}] Mock post:`, payload.title);
    return {
      externalPostId: `mock_post_${Date.now()}`,
      externalPostUrl: `https://${this.platform}.com/mock/post/${Date.now()}`,
    };
  }

  async fetchEngagement(
    postId: string,
    _accessToken: string
  ): Promise<PlatformEngagement | null> {
    // Deterministic synthetic data seeded by postId
    const seed = hashCode(postId);
    const likes = Math.abs(seed % 500);
    const comments = Math.abs((seed >> 4) % 100);
    const shares = Math.abs((seed >> 8) % 50);
    const reach = Math.abs((seed >> 12) % 5000) + 100;
    const impressions = reach + Math.abs((seed >> 16) % 3000);
    const total = likes + comments + shares;
    const engagementRate =
      impressions > 0 ? ((total / impressions) * 100).toFixed(2) : null;

    return {
      likes,
      comments,
      shares,
      reach,
      impressions,
      engagementRate,
      recordedAt: new Date(),
    };
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
