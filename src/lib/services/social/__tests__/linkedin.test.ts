import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { LinkedInAdapter } from "../linkedin";
import { AuthExpiredError } from "../types";
import type { SocialPlatformAdapter } from "../types";

const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const SHARE_STATS_URL =
  "https://api.linkedin.com/v2/organizationalEntityShareStatistics";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const adapter = new LinkedInAdapter();

interface UgcPostBody {
  author: string;
  lifecycleState: string;
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: { text: string };
      shareMediaCategory: string;
    };
  };
  visibility: Record<string, string>;
}

describe("LinkedInAdapter.getAuthUrl", () => {
  it("uses standard authorization code flow without PKCE", () => {
    const url = adapter.getAuthUrl(
      "http://localhost:3000/api/accounts/callback/linkedin",
      "state-123"
    );
    const parsed = new URL(url);

    expect(url).toContain("https://www.linkedin.com/oauth/v2/authorization");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(
      "w_member_social openid profile"
    );
    expect(parsed.searchParams.get("state")).toBe("state-123");
    // Standard auth code flow — no PKCE challenge in the redirect URL
    expect(parsed.searchParams.get("code_challenge")).toBeNull();
    expect(parsed.searchParams.get("code_challenge_method")).toBeNull();
  });
});

describe("LinkedInAdapter.exchangeCode", () => {
  it("fetches personId from GET /v2/userinfo (OIDC sub claim) and returns it in metadata for storage", async () => {
    let userinfoRequested = false;
    server.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json({ access_token: "li-token", expires_in: 5184000 })
      ),
      http.get(USERINFO_URL, () => {
        userinfoRequested = true;
        return HttpResponse.json({
          sub: "person-42",
          name: "Ada Lovelace",
          picture: "https://media.licdn.com/ada.jpg",
        });
      })
    );

    const result = await adapter.exchangeCode(
      "auth-code",
      "http://localhost:3000/api/accounts/callback/linkedin"
    );

    expect(userinfoRequested).toBe(true);
    expect(result.metadata).toEqual({ personId: "person-42" });
    expect(result.accountId).toBe("person-42");
    expect(result.accountName).toBe("Ada Lovelace");
    expect(result.profileImageUrl).toBe("https://media.licdn.com/ada.jpg");
    expect(result.accessToken).toBe("li-token");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});

describe("LinkedInAdapter.publish", () => {
  it("creates a UGC post with the correct schema", async () => {
    let body: UgcPostBody | null = null;
    server.use(
      http.post(UGC_POSTS_URL, async ({ request }) => {
        body = (await request.json()) as UgcPostBody;
        return HttpResponse.json({ id: "urn:li:ugcPost:999" });
      })
    );

    const id = await adapter.publish("token", {
      text: "hello linkedin",
      personId: "abc123",
    });

    expect(id).toBe("urn:li:ugcPost:999");
    expect(body).not.toBeNull();
    const share = body!.specificContent["com.linkedin.ugc.ShareContent"];
    expect(share.shareCommentary.text).toBe("hello linkedin");
    expect(share.shareMediaCategory).toBe("NONE");
    expect(body!.visibility["com.linkedin.ugc.MemberNetworkVisibility"]).toBe(
      "PUBLIC"
    );
    expect(body!.lifecycleState).toBe("PUBLISHED");
  });

  it("formats the author URN as urn:li:person:{personId}", async () => {
    let body: UgcPostBody | null = null;
    server.use(
      http.post(UGC_POSTS_URL, async ({ request }) => {
        body = (await request.json()) as UgcPostBody;
        return HttpResponse.json({ id: "urn:li:ugcPost:1" });
      })
    );

    await adapter.publish("token", { text: "hi", personId: "abc123" });

    expect(body!.author).toBe("urn:li:person:abc123");
  });

  it("throws AuthExpiredError when the API responds with 401 (token expiry)", async () => {
    server.use(
      http.post(UGC_POSTS_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(
      adapter.publish("expired-token", { text: "hi", personId: "abc123" })
    ).rejects.toThrow(AuthExpiredError);
  });
});

describe("LinkedInAdapter.post", () => {
  it("uses the personId stored in account metadata during connect (no refetch)", async () => {
    let body: UgcPostBody | null = null;
    // Only the ugcPosts handler is registered — any /v2/userinfo refetch
    // would trip onUnhandledRequest: "error".
    server.use(
      http.post(UGC_POSTS_URL, async ({ request }) => {
        body = (await request.json()) as UgcPostBody;
        return HttpResponse.json({ id: "urn:li:ugcPost:2" });
      })
    );

    // Spy on the metadata read to prove personId comes from stored metadata
    const personIdRead = vi.fn(() => "stored-person-7");
    const metadata: Record<string, unknown> = {};
    Object.defineProperty(metadata, "personId", {
      get: personIdRead,
      enumerable: true,
    });

    const result = await adapter.post("token", { body: "post body" }, metadata);

    expect(personIdRead).toHaveBeenCalled();
    expect(body!.author).toBe("urn:li:person:stored-person-7");
    expect(result.externalPostId).toBe("urn:li:ugcPost:2");
  });
});

describe("LinkedInAdapter.fetchEngagement", () => {
  it("returns null for all metrics (does not throw) when the API responds with 403", async () => {
    server.use(
      http.get(SHARE_STATS_URL, () => new HttpResponse(null, { status: 403 }))
    );

    const result = await adapter.fetchEngagement("urn:li:ugcPost:999", "token");

    expect(result).toBeNull();
  });

  it("throws AuthExpiredError when the API responds with 401", async () => {
    server.use(
      http.get(SHARE_STATS_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(
      adapter.fetchEngagement("urn:li:ugcPost:999", "token")
    ).rejects.toThrow(AuthExpiredError);
  });

  it("maps share statistics to engagement metrics on success", async () => {
    server.use(
      http.get(SHARE_STATS_URL, () =>
        HttpResponse.json({
          elements: [
            {
              totalShareStatistics: {
                likeCount: 12,
                commentCount: 4,
                shareCount: 2,
                impressionCount: 900,
                uniqueImpressionsCount: 700,
              },
            },
          ],
        })
      )
    );

    const result = await adapter.fetchEngagement("urn:li:ugcPost:999", "token");

    expect(result).not.toBeNull();
    expect(result!.likes).toBe(12);
    expect(result!.comments).toBe(4);
    expect(result!.shares).toBe(2);
    expect(result!.impressions).toBe(900);
    expect(result!.reach).toBe(700);
    expect(result!.recordedAt).toBeInstanceOf(Date);
  });
});

describe("LinkedInAdapter token refresh", () => {
  it("does not implement refreshAccessToken — LinkedIn tokens last 60 days and cannot be refreshed", () => {
    // The refresh cron and PublishService.refreshAccountTokens both treat a
    // missing refreshAccessToken as "skip" — implementing a throwing version
    // would instead deactivate healthy accounts 7 days before expiry.
    expect(
      (adapter as SocialPlatformAdapter).refreshAccessToken
    ).toBeUndefined();
  });
});
