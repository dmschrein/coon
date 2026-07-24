/**
 * LinkedIn Platform Adapter - OAuth2 authorization code flow + UGC posting.
 *
 * LinkedIn member auth uses the plain authorization code grant (no PKCE).
 * Access tokens last 60 days and cannot be refreshed — expiry requires a
 * full reconnect.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import { AuthExpiredError, RateLimitError } from "./types";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID ?? "";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET ?? "";
const API_BASE = "https://api.linkedin.com/v2";
const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
// OpenID Connect scopes — LinkedIn retired r_liteprofile for new apps; the
// member id now comes from the /v2/userinfo `sub` claim.
const OAUTH_SCOPES = "w_member_social openid profile";

export interface LinkedInPostInput {
  text: string;
  personId: string;
}

export class LinkedInAdapter implements SocialPlatformAdapter {
  platform = "linkedin" as const;

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPES,
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
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });
    await this.throwOnError(response, "token exchange");

    const data = await response.json();
    const profile = await this.fetchProfile(data.access_token);

    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: profile.personId,
      accountName: profile.accountName,
      profileImageUrl: profile.profileImageUrl,
      scopes: OAUTH_SCOPES.split(" "),
      // personId is persisted on the connected account so publishing never
      // has to refetch /v2/userinfo.
      metadata: { personId: profile.personId },
    };
  }

  // refreshAccessToken is intentionally NOT implemented: LinkedIn tokens last
  // 60 days and cannot be refreshed. The refresh cron and
  // PublishService.refreshAccountTokens skip adapters without this method;
  // a throwing implementation would get healthy accounts deactivated 7 days
  // before expiry. Actual expiry surfaces as AuthExpiredError (401) at
  // publish time, prompting a reconnect.

  async getAccountInfo(accessToken: string) {
    const profile = await this.fetchProfile(accessToken);
    return {
      accountId: profile.personId,
      accountName: profile.accountName,
      profileImageUrl: profile.profileImageUrl,
    };
  }

  async publish(
    accessToken: string,
    input: LinkedInPostInput
  ): Promise<string> {
    const response = await fetch(`${API_BASE}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${input.personId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: input.text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });
    await this.throwOnError(response, "publish");

    const data = await response.json();
    return data.id;
  }

  async post(
    accessToken: string,
    payload: PostPayload,
    accountMetadata?: Record<string, unknown> | null
  ): Promise<PostResult> {
    const personId = accountMetadata?.personId;
    if (typeof personId !== "string" || personId.length === 0) {
      throw new Error(
        "LinkedIn account is missing its personId. Please reconnect the account."
      );
    }

    const text = [payload.body, payload.hashtags?.map((h) => `#${h}`).join(" ")]
      .filter(Boolean)
      .join("\n\n");

    const postUrn = await this.publish(accessToken, { text, personId });

    return {
      externalPostId: postUrn,
      externalPostUrl: `https://www.linkedin.com/feed/update/${postUrn}`,
    };
  }

  async fetchEngagement(
    postUrn: string,
    accessToken: string
  ): Promise<PlatformEngagement | null> {
    const params = new URLSearchParams({
      q: "organizationalEntity",
      shares: `List(${postUrn})`,
    });
    const response = await fetch(
      `${API_BASE}/organizationalEntityShareStatistics?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    // LinkedIn only exposes share statistics to organization (company page)
    // accounts. Personal member tokens always get a 403, so treat it as
    // "no metrics available" rather than an error.
    if (response.status === 403) {
      return null;
    }
    await this.throwOnError(response, "engagement fetch");

    const json = await response.json();
    const stats = json.elements?.[0]?.totalShareStatistics;
    if (!stats) {
      return null;
    }

    const likes = stats.likeCount ?? 0;
    const comments = stats.commentCount ?? 0;
    const shares = stats.shareCount ?? 0;
    const impressions = stats.impressionCount ?? 0;
    const reach = stats.uniqueImpressionsCount ?? 0;
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

  private async fetchProfile(accessToken: string) {
    const response = await fetch(`${API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await this.throwOnError(response, "profile fetch");

    const data = await response.json();
    return {
      // The OIDC `sub` claim is the member id used in urn:li:person:{id}
      personId: data.sub as string,
      accountName: (data.name as string | undefined) ?? "",
      profileImageUrl: (data.picture as string | undefined) ?? undefined,
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
    if (!response.ok) {
      throw new Error(`LinkedIn ${action} failed: ${response.status}`);
    }
  }
}
