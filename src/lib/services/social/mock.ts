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
  twitter: {
    accountName: "mock_twitter_user",
    profileImageUrl:
      "https://abs.twimg.com/sticky/default_profile_images/default_profile.png",
  },
  linkedin: {
    accountName: "Mock LinkedIn User",
    profileImageUrl:
      "https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6oyvkq97.png",
  },
  tiktok: {
    accountName: "mock_tiktok_user",
    profileImageUrl:
      "https://sf16-sg.tiktokcdn.com/obj/eden-sg/default_avatar.png",
  },
  youtube: {
    accountName: "MockYouTubeChannel",
    profileImageUrl: "https://yt3.ggpht.com/default_avatar.png",
  },
  threads: {
    accountName: "mock_threads_user",
    profileImageUrl:
      "https://static.cdninstagram.com/rsrc.php/v3/y4/r/default_profile.png",
  },
};

/** Target engagement rates per platform (percentage) */
const PLATFORM_ENGAGEMENT_RATES: Record<string, number> = {
  instagram: 3.5,
  twitter: 0.5,
  linkedin: 2.0,
  tiktok: 5.0,
  youtube: 1.0,
  reddit: 1.2,
  threads: 1.5,
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
    const targetRate = PLATFORM_ENGAGEMENT_RATES[this.platform] ?? 1.0;

    const likes = Math.abs(seed % 500);
    const comments = Math.abs((seed >> 4) % 100);
    const shares = Math.abs((seed >> 8) % 50);
    const total = likes + comments + shares;

    // Derive impressions from total and target rate so engagementRate ≈ platform norm
    const impressions =
      total > 0 ? Math.round((total / targetRate) * 100) : 1000;
    const reach = Math.round(
      impressions * (0.6 + Math.abs((seed >> 12) % 30) / 100)
    );
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
