/**
 * YouTube Platform Adapter - OAuth2 authorization code flow + Community posts.
 *
 * Uses raw fetch against the YouTube Data API v3 REST endpoints: the
 * `googleapis` SDK is not installed, and every other adapter in this layer
 * talks to its platform with fetch, so this keeps parity.
 *
 * Google web-server OAuth is a confidential client (client_secret at token
 * exchange), so no PKCE. `access_type=offline&prompt=consent` is required for
 * Google to issue a refresh_token.
 *
 * Caveat: Google discontinued channel-bulletin insertion via activities.insert
 * and there is no official Community Posts API — real publishes may fail at
 * runtime even though this implements the documented request shape. Failures
 * surface through PublishResult.error.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import {
  AuthExpiredError,
  RateLimitError,
  SubscriberThresholdError,
} from "./types";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID ?? "";
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? "";
const API_BASE = "https://www.googleapis.com/youtube/v3";
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_SCOPES =
  "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly";

interface GoogleErrorBody {
  error?: { errors?: Array<{ reason?: string }> };
}

export class YouTubeAdapter implements SocialPlatformAdapter {
  platform = "youtube" as const;

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: YOUTUBE_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
      }),
    });
    await this.throwOnError(response, "token exchange");

    const data = await response.json();
    const channel = await this.fetchChannel(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: channel.id,
      accountName: channel.title,
      profileImageUrl: channel.thumbnailUrl,
      scopes: OAUTH_SCOPES.split(" "),
      // channel_id is persisted on the connected account so publishing never
      // has to refetch /channels.
      metadata: { channel_id: channel.id },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
      }),
    });
    await this.throwOnError(response, "token refresh");

    const data = await response.json();
    return {
      accessToken: data.access_token,
      // Google omits refresh_token in refresh responses; echo the incoming
      // one back or PublishService.updateTokens wipes the stored token.
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getAccountInfo(accessToken: string) {
    const channel = await this.fetchChannel(accessToken);
    return {
      accountId: channel.id,
      accountName: channel.title,
      profileImageUrl: channel.thumbnailUrl,
    };
  }

  async post(
    accessToken: string,
    payload: PostPayload,
    accountMetadata?: Record<string, unknown> | null
  ): Promise<PostResult> {
    const channelId = accountMetadata?.channel_id;
    if (typeof channelId !== "string" || channelId.length === 0) {
      throw new Error(
        "YouTube account is missing its channel_id. Please reconnect the account."
      );
    }

    const text = [payload.body, payload.hashtags?.map((h) => `#${h}`).join(" ")]
      .filter(Boolean)
      .join("\n\n");

    const params = new URLSearchParams({ part: "snippet,contentDetails" });
    const response = await fetch(`${API_BASE}/activities?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: { description: text },
        contentDetails: {
          bulletin: {
            resourceId: { kind: "youtube#channel", channelId },
          },
        },
      }),
    });
    await this.throwOnError(response, "publish");

    const data = await response.json();
    return {
      externalPostId: data.id,
      // The activities API returns an activity id, not a shareable post URL;
      // the channel's community tab is the closest stable link.
      externalPostUrl: `https://www.youtube.com/channel/${channelId}/community`,
    };
  }

  async fetchEngagement(
    videoId: string,
    accessToken: string
  ): Promise<PlatformEngagement | null> {
    const params = new URLSearchParams({ id: videoId, part: "statistics" });
    const response = await fetch(`${API_BASE}/videos?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await this.throwOnError(response, "engagement fetch");

    const json = await response.json();
    const stats = json.items?.[0]?.statistics;
    if (!stats) {
      return null;
    }

    // Statistics counts arrive as strings from the API
    const likes = Number(stats.likeCount ?? 0);
    const comments = Number(stats.commentCount ?? 0);
    const views = Number(stats.viewCount ?? 0);
    const total = likes + comments;
    const engagementRate =
      views > 0 ? ((total / views) * 100).toFixed(2) : null;

    return {
      likes,
      comments,
      // The videos endpoint exposes no share count, and viewCount does not
      // distinguish unique vs. total views — it maps to both reach and
      // impressions.
      shares: 0,
      reach: views,
      impressions: views,
      engagementRate,
      recordedAt: new Date(),
    };
  }

  private async fetchChannel(accessToken: string) {
    const params = new URLSearchParams({ part: "snippet", mine: "true" });
    const response = await fetch(`${API_BASE}/channels?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await this.throwOnError(response, "channel fetch");

    const data = await response.json();
    const channel = data.items?.[0];
    if (!channel) {
      throw new Error("No YouTube channel found for this Google account");
    }
    return {
      id: channel.id as string,
      title: (channel.snippet?.title as string | undefined) ?? "",
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url as
        | string
        | undefined,
    };
  }

  private async throwOnError(response: Response, action: string) {
    if (response.status === 401) {
      throw new AuthExpiredError();
    }
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new RateLimitError(
        undefined,
        Number.isFinite(retryAfter) ? retryAfter : undefined
      );
    }
    if (response.status === 403) {
      const body = (await response
        .json()
        .catch(() => null)) as GoogleErrorBody | null;
      const reasons = body?.error?.errors?.map((e) => e.reason) ?? [];
      if (reasons.includes("forbiddenForAccount")) {
        throw new SubscriberThresholdError();
      }
    }
    if (!response.ok) {
      throw new Error(`YouTube ${action} failed: ${response.status}`);
    }
  }
}
