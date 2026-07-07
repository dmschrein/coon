/**
 * Twitter Platform Adapter - OAuth2 PKCE + posting via Twitter API v2.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import { AuthExpiredError, RateLimitError } from "./types";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID ?? "";
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET ?? "";
const API_BASE = "https://api.twitter.com/2";
const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const OAUTH_SCOPES = "tweet.read tweet.write users.read offline.access";
const MAX_TWEET_LENGTH = 280;

/** Cookie carrying the PKCE code verifier between connect and callback. */
export const TWITTER_CODE_VERIFIER_COOKIE = "twitter_code_verifier";

export interface TweetInput {
  text: string;
  inReplyToId?: string;
}

export interface ContentValidationResult {
  valid: boolean;
  error?: string;
}

export class TwitterAdapter implements SocialPlatformAdapter {
  platform = "twitter" as const;

  getAuthUrl(
    redirectUri: string,
    state: string,
    codeChallenge?: string
  ): string {
    if (!codeChallenge) {
      throw new Error("Twitter OAuth requires a PKCE code challenge");
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string, codeVerifier?: string) {
    if (!codeVerifier) {
      throw new Error("Twitter OAuth requires a PKCE code verifier");
    }
    const data = await this.requestToken("token exchange", {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: TWITTER_CLIENT_ID,
    });

    const accountInfo = await this.getAccountInfo(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: accountInfo.accountId,
      accountName: accountInfo.accountName,
      profileImageUrl: accountInfo.profileImageUrl,
      scopes: (data.scope as string | undefined)?.split(" "),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const data = await this.requestToken("token refresh", {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: TWITTER_CLIENT_ID,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getAccountInfo(accessToken: string) {
    const response = await fetch(
      `${API_BASE}/users/me?user.fields=profile_image_url`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    await this.throwOnError(response, "account info");

    const { data } = await response.json();
    return {
      accountId: data.id,
      accountName: data.username,
      profileImageUrl: data.profile_image_url ?? undefined,
    };
  }

  validateContent(text: string): ContentValidationResult {
    if (text.length > MAX_TWEET_LENGTH) {
      return {
        valid: false,
        error: `Tweet exceeds ${MAX_TWEET_LENGTH} characters (${text.length})`,
      };
    }
    return { valid: true };
  }

  async publish(accessToken: string, input: TweetInput): Promise<string> {
    const response = await fetch(`${API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text,
        ...(input.inReplyToId && {
          reply: { in_reply_to_tweet_id: input.inReplyToId },
        }),
      }),
    });
    await this.throwOnError(response, "publish");

    const { data } = await response.json();
    return data.id;
  }

  async publishThread(accessToken: string, texts: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const text of texts) {
      const id = await this.publish(accessToken, {
        text,
        inReplyToId: ids[ids.length - 1],
      });
      ids.push(id);
    }
    return ids;
  }

  async post(accessToken: string, payload: PostPayload): Promise<PostResult> {
    const text = [payload.body, payload.hashtags?.map((h) => `#${h}`).join(" ")]
      .filter(Boolean)
      .join("\n\n");

    const validation = this.validateContent(text);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const tweetId = await this.publish(accessToken, { text });
    return {
      externalPostId: tweetId,
      externalPostUrl: `https://twitter.com/i/web/status/${tweetId}`,
    };
  }

  async fetchEngagement(
    tweetId: string,
    accessToken: string
  ): Promise<PlatformEngagement | null> {
    const response = await fetch(
      `${API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    await this.throwOnError(response, "engagement fetch");

    const json = await response.json();
    const metrics = json.data?.public_metrics;
    if (!metrics) {
      return null;
    }

    const likes = metrics.like_count ?? 0;
    const shares = metrics.retweet_count ?? 0;
    const comments = metrics.reply_count ?? 0;
    const impressions = metrics.impression_count ?? 0;
    const total = likes + comments + shares;
    const engagementRate =
      impressions > 0 ? ((total / impressions) * 100).toFixed(2) : null;

    return {
      likes,
      comments,
      shares,
      reach: 0,
      impressions,
      engagementRate,
      recordedAt: new Date(),
    };
  }

  private async requestToken(
    action: string,
    params: Record<string, string>
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  }> {
    const credentials = Buffer.from(
      `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(`${API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });
    await this.throwOnError(response, action);

    return response.json();
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
      throw new Error(`Twitter ${action} failed: ${response.status}`);
    }
  }
}
