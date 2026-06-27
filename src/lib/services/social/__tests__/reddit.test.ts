import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedditAdapter } from "../reddit";
import { AuthExpiredError, RateLimitError } from "../types";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

function okJson(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

describe("RedditAdapter.getAuthUrl", () => {
  const adapter = new RedditAdapter();

  it("builds an authorize URL with required params", () => {
    const url = adapter.getAuthUrl("https://app/cb", "state-1");
    expect(url).toContain("https://www.reddit.com/api/v1/authorize?");
    expect(url).toContain("response_type=code");
    expect(url).toContain("state=state-1");
    expect(url).toContain("duration=permanent");
    expect(url).toContain("scope=submit+identity+read");
  });
});

describe("RedditAdapter.getAccountInfo", () => {
  const adapter = new RedditAdapter();

  it("returns account info from oauth.reddit.com/api/v1/me", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ id: "u1", name: "redditor", icon_img: "https://img/avatar.png" })
    );

    const info = await adapter.getAccountInfo("token");
    expect(info).toEqual({
      accountId: "u1",
      accountName: "redditor",
      profileImageUrl: "https://img/avatar.png",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://oauth.reddit.com/api/v1/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      })
    );
  });

  it("omits profileImageUrl when icon_img is absent", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ id: "u1", name: "redditor" }));
    const info = await adapter.getAccountInfo("token");
    expect(info.profileImageUrl).toBeUndefined();
  });

  it("throws generic error on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(adapter.getAccountInfo("token")).rejects.toThrow(
      "Reddit account info failed: 403"
    );
  });
});

describe("RedditAdapter.exchangeCode", () => {
  const adapter = new RedditAdapter();

  it("exchanges code for tokens and returns account info", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          access_token: "at",
          refresh_token: "rt",
          expires_in: 3600,
          scope: "submit identity read",
        })
      )
      .mockResolvedValueOnce(okJson({ id: "u1", name: "redditor" }));

    const result = await adapter.exchangeCode("code", "https://app/cb");
    expect(result.accessToken).toBe("at");
    expect(result.refreshToken).toBe("rt");
    expect(result.accountId).toBe("u1");
    expect(result.accountName).toBe("redditor");
    expect(result.scopes).toEqual(["submit", "identity", "read"]);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("sends Basic auth credentials on token exchange", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({ access_token: "at", refresh_token: "rt", expires_in: 1 })
      )
      .mockResolvedValueOnce(okJson({ id: "u1", name: "redditor" }));

    await adapter.exchangeCode("code", "https://app/cb");
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toMatch(/^Basic /);
    expect(headers["User-Agent"]).toBe("community-builder/1.0");
  });

  it("throws when token exchange fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(
      adapter.exchangeCode("code", "https://app/cb")
    ).rejects.toThrow("Reddit token exchange failed: 400");
  });
});

describe("RedditAdapter.refreshAccessToken", () => {
  const adapter = new RedditAdapter();

  it("returns refreshed token, preserving original refresh token when not returned", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ access_token: "new-at", expires_in: 3600 })
    );
    const result = await adapter.refreshAccessToken("old-rt");
    expect(result.accessToken).toBe("new-at");
    expect(result.refreshToken).toBe("old-rt");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("uses the returned refresh token when present", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ access_token: "new-at", refresh_token: "new-rt", expires_in: 1 })
    );
    const result = await adapter.refreshAccessToken("old-rt");
    expect(result.refreshToken).toBe("new-rt");
  });

  it("throws on refresh failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(adapter.refreshAccessToken("rt")).rejects.toThrow(
      "Reddit token refresh failed: 401"
    );
  });
});

describe("RedditAdapter.post", () => {
  const adapter = new RedditAdapter();

  it("submits a self post to the given subreddit", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        json: { data: { id: "abc", url: "https://reddit.com/r/test/abc" } },
      })
    );

    const result = await adapter.post("token", {
      body: "post body",
      title: "My Title",
      subreddit: "mysubreddit",
    });

    expect(result).toEqual({
      externalPostId: "abc",
      externalPostUrl: "https://reddit.com/r/test/abc",
    });
    const body = mockFetch.mock.calls[0][1].body.toString();
    expect(body).toContain("sr=mysubreddit");
    expect(body).toContain("title=My+Title");
  });

  it("falls back to communityTarget then 'test' subreddit, and derives title from body", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ json: { data: {} } }));

    await adapter.post("token", {
      body: "a long body that becomes the title",
      communityTarget: "community-sub",
    });

    const body = mockFetch.mock.calls[0][1].body.toString();
    expect(body).toContain("sr=community-sub");
    expect(body).toContain("title=a+long+body");
  });

  it("returns empty fields when response data is missing", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ json: {} }));
    const result = await adapter.post("token", { body: "x", subreddit: "s" });
    expect(result).toEqual({ externalPostId: "", externalPostUrl: "" });
  });

  it("throws on post failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(
      adapter.post("token", { body: "x", subreddit: "s" })
    ).rejects.toThrow("Reddit post failed: 403");
  });
});

describe("RedditAdapter.fetchEngagement", () => {
  const adapter = new RedditAdapter();

  it("maps ups/comments/crossposts to engagement", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        data: {
          children: [{ data: { ups: 42, num_comments: 7, num_crossposts: 3 } }],
        },
      })
    );

    const result = await adapter.fetchEngagement("postid", "token");
    expect(result).not.toBeNull();
    expect(result!.likes).toBe(42);
    expect(result!.comments).toBe(7);
    expect(result!.shares).toBe(3);
    expect(result!.reach).toBe(0);
    expect(result!.impressions).toBe(0);
    expect(result!.engagementRate).toBeNull();
    expect(result!.recordedAt).toBeInstanceOf(Date);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://oauth.reddit.com/api/info?id=t3_postid",
      expect.any(Object)
    );
  });

  it("defaults missing metrics to 0", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ data: { children: [{ data: {} }] } })
    );
    const result = await adapter.fetchEngagement("postid", "token");
    expect(result!.likes).toBe(0);
    expect(result!.comments).toBe(0);
    expect(result!.shares).toBe(0);
  });

  it("returns null when there are no children", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: { children: [] } }));
    const result = await adapter.fetchEngagement("postid", "token");
    expect(result).toBeNull();
  });

  it("returns null when data is missing entirely", async () => {
    mockFetch.mockResolvedValueOnce(okJson({}));
    const result = await adapter.fetchEngagement("postid", "token");
    expect(result).toBeNull();
  });

  it("returns null for removed posts", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        data: { children: [{ data: { removed_by_category: "moderator" } }] },
      })
    );
    const result = await adapter.fetchEngagement("postid", "token");
    expect(result).toBeNull();
  });

  it("throws AuthExpiredError on 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(adapter.fetchEngagement("p", "token")).rejects.toThrow(
      AuthExpiredError
    );
  });

  it("throws RateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(adapter.fetchEngagement("p", "token")).rejects.toThrow(
      RateLimitError
    );
  });

  it("throws generic error on other failures", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(adapter.fetchEngagement("p", "token")).rejects.toThrow(
      "Reddit engagement fetch failed: 500"
    );
  });
});
