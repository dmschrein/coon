/**
 * Reddit Platform Adapter - OAuth + posting via Reddit API.
 */

import type { SocialPlatformAdapter, PostPayload, PostResult } from "./types";

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID ?? "";
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET ?? "";
const REDDIT_USER_AGENT = "community-builder/1.0";

export class RedditAdapter implements SocialPlatformAdapter {
  platform = "reddit" as const;

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: REDDIT_CLIENT_ID,
      response_type: "code",
      state,
      redirect_uri: redirectUri,
      duration: "permanent",
      scope: "submit identity read",
    });
    return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    const credentials = Buffer.from(
      `${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": REDDIT_USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    const accountInfo = await this.getAccountInfo(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: accountInfo.accountId,
      accountName: accountInfo.accountName,
      profileImageUrl: accountInfo.profileImageUrl,
      scopes: (data.scope as string)?.split(" "),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const credentials = Buffer.from(
      `${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": REDDIT_USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getAccountInfo(accessToken: string) {
    const response = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": REDDIT_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit account info failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      accountId: data.id,
      accountName: data.name,
      profileImageUrl: data.icon_img ?? undefined,
    };
  }

  async post(accessToken: string, payload: PostPayload): Promise<PostResult> {
    const subreddit = payload.subreddit ?? payload.communityTarget ?? "test";
    const title = payload.title ?? payload.body.slice(0, 300);
    const body = payload.body;

    const response = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": REDDIT_USER_AGENT,
      },
      body: new URLSearchParams({
        sr: subreddit,
        kind: "self",
        title,
        text: body,
        api_type: "json",
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit post failed: ${response.status}`);
    }

    const data = await response.json();
    const postData = data.json?.data;

    return {
      externalPostId: postData?.id ?? "",
      externalPostUrl: postData?.url ?? "",
    };
  }
}
