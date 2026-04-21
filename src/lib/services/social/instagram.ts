/**
 * Instagram Platform Adapter - OAuth + posting via Instagram Graph API.
 *
 * Uses Meta's Instagram Graph API (requires Facebook Business account).
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import { AuthExpiredError, RateLimitError } from "./types";

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID ?? "";
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? "";

export class InstagramAdapter implements SocialPlatformAdapter {
  platform = "instagram" as const;

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      redirect_uri: redirectUri,
      scope: "instagram_basic,instagram_content_publish",
      response_type: "code",
      state,
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string) {
    // Step 1: Exchange code for short-lived token
    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: new URLSearchParams({
          client_id: INSTAGRAM_APP_ID,
          client_secret: INSTAGRAM_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(
        `Instagram token exchange failed: ${tokenResponse.status}`
      );
    }

    const shortLivedData = await tokenResponse.json();

    // Step 2: Exchange for long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortLivedData.access_token}`
    );

    if (!longLivedResponse.ok) {
      throw new Error(
        `Instagram long-lived token exchange failed: ${longLivedResponse.status}`
      );
    }

    const longLivedData = await longLivedResponse.json();
    const accountInfo = await this.getAccountInfo(longLivedData.access_token);

    return {
      accessToken: longLivedData.access_token,
      expiresAt: new Date(Date.now() + longLivedData.expires_in * 1000),
      accountId: accountInfo.accountId,
      accountName: accountInfo.accountName,
      profileImageUrl: accountInfo.profileImageUrl,
      scopes: ["instagram_basic", "instagram_content_publish"],
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`
    );

    if (!response.ok) {
      throw new Error(`Instagram token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getAccountInfo(accessToken: string) {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Instagram account info failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      accountId: data.id,
      accountName: data.username,
      profileImageUrl: data.profile_picture_url ?? undefined,
    };
  }

  async post(accessToken: string, payload: PostPayload): Promise<PostResult> {
    const caption = [
      payload.body,
      payload.hashtags?.map((h) => `#${h}`).join(" "),
    ]
      .filter(Boolean)
      .join("\n\n");

    // Instagram requires a media URL for posting
    const imageUrl = payload.mediaUrls?.[0];
    if (!imageUrl) {
      throw new Error("Instagram requires at least one media URL to post");
    }

    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.instagram.com/me/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      throw new Error(
        `Instagram container creation failed: ${containerResponse.status}`
      );
    }

    const container = await containerResponse.json();

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.instagram.com/me/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      throw new Error(`Instagram publish failed: ${publishResponse.status}`);
    }

    const published = await publishResponse.json();

    return {
      externalPostId: published.id,
      externalPostUrl: `https://www.instagram.com/p/${published.id}`,
    };
  }

  async fetchEngagement(
    postId: string,
    accessToken: string
  ): Promise<PlatformEngagement> {
    const metrics = "impressions,reach,likes,comments,shares,saved";
    const response = await fetch(
      `https://graph.instagram.com/${postId}/insights?metric=${metrics}&access_token=${accessToken}`
    );

    if (response.status === 401) {
      throw new AuthExpiredError();
    }
    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (!response.ok) {
      throw new Error(`Instagram engagement fetch failed: ${response.status}`);
    }

    const json = await response.json();
    const data = json.data as { name: string; values: { value: number }[] }[];

    const getValue = (name: string): number => {
      const metric = data.find((m) => m.name === name);
      return metric?.values?.[0]?.value ?? 0;
    };

    const likes = getValue("likes");
    const comments = getValue("comments");
    const shares = getValue("shares");
    const reach = getValue("reach");
    const impressions = getValue("impressions");
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
