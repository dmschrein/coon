/**
 * Threads Platform Adapter — OAuth + two-step publishing via the Threads API.
 *
 * Threads is its own platform, separate from Instagram, but both live under the
 * same Meta app. When Instagram is already connected, the stored Instagram
 * token can be swapped for a Threads token through the token exchange endpoint
 * instead of sending the user through a second authorization round-trip.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
  LinkedTokenExchange,
} from "./types";
import { AuthExpiredError, RateLimitError } from "./types";

const THREADS_APP_ID =
  process.env.THREADS_APP_ID ?? process.env.INSTAGRAM_APP_ID ?? "";
const THREADS_APP_SECRET =
  process.env.THREADS_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET ?? "";

const AUTH_BASE = "https://www.threads.net";
const GRAPH_BASE = "https://graph.threads.net";
const API_BASE = `${GRAPH_BASE}/v1.0`;
const SCOPES = ["threads_basic", "threads_content_publish"];

/** Lifetime insight metrics the Threads API reports for a post. */
const INSIGHT_METRICS = ["likes", "replies", "reposts", "views"] as const;

interface InsightMetric {
  name: string;
  total_value?: { value: number };
  values?: { value: number }[];
}

export class ThreadsAdapter implements SocialPlatformAdapter {
  platform = "threads" as const;

  /** Threads and Instagram share a Meta app, so an Instagram token can seed a Threads one. */
  linkedPlatform = "instagram" as const;

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: THREADS_APP_ID,
      redirect_uri: redirectUri,
      scope: SCOPES.join(","),
      response_type: "code",
      state,
    });
    return `${AUTH_BASE}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    // Step 1: authorization code -> short-lived token
    const tokenResponse = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
      method: "POST",
      body: new URLSearchParams({
        client_id: THREADS_APP_ID,
        client_secret: THREADS_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    await this.throwOnError(tokenResponse, "token exchange");

    const shortLived = await tokenResponse.json();

    // Step 2: short-lived token -> long-lived (60 day) token + account details
    return this.exchangeLinkedToken(shortLived.access_token);
  }

  /**
   * Trades any token issued to the same Meta app for a long-lived Threads
   * connection. Fed the short-lived token from the OAuth flow, or the stored
   * Instagram token for the "Connect with Instagram" shortcut, which skips a
   * second authorization round-trip.
   */
  async exchangeLinkedToken(accessToken: string): Promise<LinkedTokenExchange> {
    const params = new URLSearchParams({
      grant_type: "th_exchange_token",
      client_secret: THREADS_APP_SECRET,
      access_token: accessToken,
    });
    const response = await fetch(
      `${GRAPH_BASE}/access_token?${params.toString()}`
    );
    await this.throwOnError(response, "long-lived token exchange");

    const data = await response.json();
    const longLivedToken = data.access_token as string;
    const accountInfo = await this.getAccountInfo(longLivedToken);

    return {
      accessToken: longLivedToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: accountInfo.accountId,
      accountName: accountInfo.accountName,
      profileImageUrl: accountInfo.profileImageUrl,
      scopes: SCOPES,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const params = new URLSearchParams({
      grant_type: "th_refresh_token",
      access_token: refreshToken,
    });
    const response = await fetch(
      `${GRAPH_BASE}/refresh_access_token?${params.toString()}`
    );
    await this.throwOnError(response, "token refresh");

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getAccountInfo(accessToken: string) {
    const params = new URLSearchParams({
      fields: "id,username,threads_profile_picture_url",
      access_token: accessToken,
    });
    const response = await fetch(`${API_BASE}/me?${params.toString()}`);
    await this.throwOnError(response, "account info");

    const data = await response.json();
    return {
      accountId: data.id,
      accountName: data.username,
      profileImageUrl: data.threads_profile_picture_url ?? undefined,
    };
  }

  /**
   * Posts text to Threads in two steps: create a media container, then publish
   * it. A failure in either step throws — the caller records nothing, so a
   * created-but-unpublished container never becomes visible app state.
   */
  async publish(accessToken: string, content: string): Promise<string> {
    const container = await this.request<{ id: string }>(
      "me/threads",
      { media_type: "TEXT", text: content },
      accessToken,
      "container creation"
    );

    const published = await this.request<{ id: string }>(
      "me/threads_publish",
      { creation_id: container.id },
      accessToken,
      "publish"
    );

    return published.id;
  }

  async post(accessToken: string, payload: PostPayload): Promise<PostResult> {
    const text = [payload.body, payload.hashtags?.map((h) => `#${h}`).join(" ")]
      .filter(Boolean)
      .join("\n\n");

    const postId = await this.publish(accessToken, text);

    return {
      externalPostId: postId,
      externalPostUrl: await this.getPermalink(postId, accessToken),
    };
  }

  /**
   * Reads the canonical post URL. The post is already live at this point, so a
   * failed lookup falls back to a derived URL rather than failing the publish.
   */
  private async getPermalink(
    postId: string,
    accessToken: string
  ): Promise<string> {
    const fallback = `${AUTH_BASE}/t/${postId}`;
    try {
      const params = new URLSearchParams({
        fields: "permalink",
        access_token: accessToken,
      });
      const response = await fetch(
        `${API_BASE}/${postId}?${params.toString()}`
      );
      if (!response.ok) {
        return fallback;
      }
      const data = await response.json();
      return (data.permalink as string) ?? fallback;
    } catch {
      return fallback;
    }
  }

  async fetchEngagement(
    postId: string,
    accessToken: string
  ): Promise<PlatformEngagement | null> {
    const params = new URLSearchParams({
      metric: INSIGHT_METRICS.join(","),
      access_token: accessToken,
    });
    const response = await fetch(
      `${API_BASE}/${postId}/insights?${params.toString()}`
    );
    if (response.status === 404) {
      return null;
    }
    await this.throwOnError(response, "engagement fetch");

    const json = await response.json();
    const metrics = (json.data ?? []) as InsightMetric[];
    const valueOf = (name: string): number => {
      const metric = metrics.find((m) => m.name === name);
      return Number(
        metric?.total_value?.value ?? metric?.values?.[0]?.value ?? 0
      );
    };

    const likes = valueOf("likes");
    const replies = valueOf("replies");
    const reposts = valueOf("reposts");
    const views = valueOf("views");
    const interactions = likes + replies + reposts;
    const engagementRate =
      views > 0 ? ((interactions / views) * 100).toFixed(2) : null;

    return {
      // Threads-native counts
      replies,
      reposts,
      views,
      // Shared shape the analytics tables persist
      likes,
      comments: replies,
      shares: reposts,
      reach: 0,
      impressions: views,
      engagementRate,
      recordedAt: new Date(),
    };
  }

  private async request<T>(
    path: string,
    body: Record<string, string>,
    accessToken: string,
    action: string
  ): Promise<T> {
    const response = await fetch(`${API_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: accessToken }),
    });
    await this.throwOnError(response, action);
    return response.json() as Promise<T>;
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
    if (!response.ok) {
      throw new Error(`Threads ${action} failed: ${response.status}`);
    }
  }
}
