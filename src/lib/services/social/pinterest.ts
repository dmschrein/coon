/**
 * Pinterest Platform Adapter - OAuth2 + Pin publishing via the Pinterest API v5.
 *
 * Pinterest is a confidential client: the token endpoint authenticates with a
 * Basic header built from the app id/secret, so no PKCE.
 *
 * Board list: pins must be created on a board, so the user's boards are fetched
 * once at connect time and cached on the connected account
 * (`metadata.boards` + `metadata.boards_cached_at`). PublishService refreshes
 * that cache when it is older than BOARDS_CACHE_TTL_MS.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import { AuthExpiredError, RateLimitError } from "./types";
import type { PinterestBoard } from "@/types";

const PINTEREST_APP_ID = process.env.PINTEREST_APP_ID ?? "";
const PINTEREST_APP_SECRET = process.env.PINTEREST_APP_SECRET ?? "";
const API_BASE = "https://api.pinterest.com/v5";
const AUTHORIZE_URL = "https://www.pinterest.com/oauth/";
const TOKEN_URL = `${API_BASE}/oauth/token`;
const OAUTH_SCOPES = "boards:read,pins:write,user_accounts:read";

/** Boards change rarely — refetch at most once a day. */
export const BOARDS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface PinMetrics {
  save_count?: number;
  click_count?: number;
  impression_count?: number;
}

export class PinterestAdapter implements SocialPlatformAdapter {
  platform = "pinterest" as const;

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: PINTEREST_APP_ID,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPES,
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    await this.throwOnError(response, "token exchange");

    const data = await response.json();
    const account = await this.getAccountInfo(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: account.accountId,
      accountName: account.accountName,
      profileImageUrl: account.profileImageUrl,
      scopes: OAUTH_SCOPES.split(","),
      // Boards are cached on the account so the publish UI never calls Pinterest.
      metadata: await this.fetchMetadata(data.access_token),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    await this.throwOnError(response, "token refresh");

    const data = await response.json();
    return {
      accessToken: data.access_token,
      // Pinterest omits refresh_token unless rotation is enabled; echo the
      // incoming one back or PublishService.updateTokens wipes it.
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getAccountInfo(accessToken: string) {
    const response = await fetch(`${API_BASE}/user_account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await this.throwOnError(response, "account info fetch");

    const data = await response.json();
    return {
      accountId: data.id as string,
      accountName: data.username as string,
      profileImageUrl: (data.profile_image as string | undefined) ?? undefined,
    };
  }

  /** Fetches every board the user can pin to. */
  async getBoards(accessToken: string): Promise<PinterestBoard[]> {
    const response = await fetch(`${API_BASE}/boards`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await this.throwOnError(response, "board fetch");

    const data = await response.json();
    const items = (data.items ?? []) as { id: string; name: string }[];
    return items.map((board) => ({ id: board.id, name: board.name }));
  }

  async fetchMetadata(accessToken: string): Promise<Record<string, unknown>> {
    return {
      boards: await this.getBoards(accessToken),
      boards_cached_at: new Date().toISOString(),
    };
  }

  isMetadataStale(metadata: Record<string, unknown> | null): boolean {
    const cachedAt = metadata?.boards_cached_at;
    if (typeof cachedAt !== "string") {
      return true;
    }
    const age = Date.now() - new Date(cachedAt).getTime();
    return !Number.isFinite(age) || age > BOARDS_CACHE_TTL_MS;
  }

  async post(
    accessToken: string,
    payload: PostPayload,
    accountMetadata?: Record<string, unknown> | null
  ): Promise<PostResult> {
    const imageUrl = payload.mediaUrls?.[0];
    if (!imageUrl) {
      throw new Error("Pinterest requires an image URL to create a Pin");
    }

    // The selected board wins; otherwise pin to the first cached board.
    const boards =
      (accountMetadata?.boards as PinterestBoard[] | undefined) ?? [];
    const boardId = payload.boardId ?? boards[0]?.id;
    if (!boardId) {
      throw new Error(
        "Pinterest account has no board to pin to. Select a board or reconnect the account."
      );
    }

    const description = [
      payload.body,
      payload.hashtags?.map((h) => `#${h}`).join(" "),
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch(`${API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        title: payload.title,
        description,
        link: payload.link,
        // v5 pulls the image from a hosted URL — there is no file upload.
        media_source: { source_type: "image_url", url: imageUrl },
      }),
    });
    await this.throwOnError(response, "publish");

    const data = await response.json();
    return {
      externalPostId: data.id,
      externalPostUrl: `https://www.pinterest.com/pin/${data.id}/`,
    };
  }

  async fetchEngagement(
    pinId: string,
    accessToken: string
  ): Promise<PlatformEngagement | null> {
    const response = await fetch(`${API_BASE}/pins/${pinId}?pin_metrics=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 404) {
      return null;
    }
    await this.throwOnError(response, "engagement fetch");

    const json = await response.json();
    // Metrics arrive under pin_metrics.all_time; older responses inline them.
    const metrics = (json.pin_metrics?.all_time ??
      json.pin_metrics ??
      {}) as PinMetrics;

    const shares = Number(metrics.save_count ?? 0);
    const clicks = Number(metrics.click_count ?? 0);
    const impressions = Number(metrics.impression_count ?? 0);
    const engagementRate =
      impressions > 0
        ? (((shares + clicks) / impressions) * 100).toFixed(2)
        : null;

    return {
      // Pin metrics report no likes or comments.
      likes: 0,
      comments: 0,
      shares,
      clicks,
      // Pinterest reports no unique-viewer count; impressions is the closest.
      reach: impressions,
      impressions,
      engagementRate,
      recordedAt: new Date(),
    };
  }

  private basicAuth(): string {
    return Buffer.from(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`).toString(
      "base64"
    );
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
      throw new Error(`Pinterest ${action} failed: ${response.status}`);
    }
  }
}
