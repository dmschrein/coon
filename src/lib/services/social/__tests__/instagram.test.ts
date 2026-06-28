import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstagramAdapter } from "../instagram";
import { AuthExpiredError, RateLimitError } from "../types";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

function okJson(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

describe("InstagramAdapter.getAuthUrl", () => {
  const adapter = new InstagramAdapter();

  it("builds an authorize URL with required params", () => {
    const url = adapter.getAuthUrl("https://app/callback", "state-123");
    expect(url).toContain("https://api.instagram.com/oauth/authorize?");
    expect(url).toContain("redirect_uri=https%3A%2F%2Fapp%2Fcallback");
    expect(url).toContain("state=state-123");
    expect(url).toContain("response_type=code");
    expect(url).toContain("scope=instagram_basic%2Cinstagram_content_publish");
  });
});

describe("InstagramAdapter.getAccountInfo", () => {
  const adapter = new InstagramAdapter();

  it("returns account info from graph.instagram.com/me", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        id: "ig-1",
        username: "creator",
        profile_picture_url: "https://img/pic.jpg",
      })
    );

    const info = await adapter.getAccountInfo("token");
    expect(info).toEqual({
      accountId: "ig-1",
      accountName: "creator",
      profileImageUrl: "https://img/pic.jpg",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://graph.instagram.com/me?fields=")
    );
  });

  it("omits profileImageUrl when picture url is absent", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ id: "ig-1", username: "creator" })
    );
    const info = await adapter.getAccountInfo("token");
    expect(info.profileImageUrl).toBeUndefined();
  });

  it("throws generic error on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(adapter.getAccountInfo("token")).rejects.toThrow(
      "Instagram account info failed: 500"
    );
  });
});

describe("InstagramAdapter.exchangeCode", () => {
  const adapter = new InstagramAdapter();

  it("exchanges code for short then long-lived token and returns account info", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ access_token: "short-token" }))
      .mockResolvedValueOnce(
        okJson({ access_token: "long-token", expires_in: 5184000 })
      )
      .mockResolvedValueOnce(
        okJson({ id: "ig-1", username: "creator", profile_picture_url: "p" })
      );

    const result = await adapter.exchangeCode("code-123", "https://app/cb");

    expect(result.accessToken).toBe("long-token");
    expect(result.accountId).toBe("ig-1");
    expect(result.accountName).toBe("creator");
    expect(result.scopes).toEqual([
      "instagram_basic",
      "instagram_content_publish",
    ]);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("throws when short-lived token exchange fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(
      adapter.exchangeCode("code", "https://app/cb")
    ).rejects.toThrow("Instagram token exchange failed: 400");
  });

  it("throws when long-lived token exchange fails", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ access_token: "short-token" }))
      .mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(
      adapter.exchangeCode("code", "https://app/cb")
    ).rejects.toThrow("Instagram long-lived token exchange failed: 401");
  });
});

describe("InstagramAdapter.refreshAccessToken", () => {
  const adapter = new InstagramAdapter();

  it("returns a refreshed token with expiry", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ access_token: "refreshed", expires_in: 5184000 })
    );
    const result = await adapter.refreshAccessToken("refresh-token");
    expect(result.accessToken).toBe("refreshed");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("throws on refresh failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(adapter.refreshAccessToken("rt")).rejects.toThrow(
      "Instagram token refresh failed: 400"
    );
  });
});

describe("InstagramAdapter.post", () => {
  const adapter = new InstagramAdapter();

  it("creates a media container then publishes it", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ id: "container-1" }))
      .mockResolvedValueOnce(okJson({ id: "published-1" }));

    const result = await adapter.post("token", {
      body: "great post",
      hashtags: ["community", "build"],
      mediaUrls: ["https://img/photo.jpg"],
    });

    expect(result).toEqual({
      externalPostId: "published-1",
      externalPostUrl: "https://www.instagram.com/p/published-1",
    });

    // First call creates container with caption containing body + hashtags
    const containerBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(containerBody.image_url).toBe("https://img/photo.jpg");
    expect(containerBody.caption).toContain("great post");
    expect(containerBody.caption).toContain("#community #build");

    // Second call publishes using the container id
    const publishBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(publishBody.creation_id).toBe("container-1");
  });

  it("throws when no media URL is provided", async () => {
    await expect(adapter.post("token", { body: "no media" })).rejects.toThrow(
      /at least one media URL/
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws when container creation fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(
      adapter.post("token", { body: "x", mediaUrls: ["u"] })
    ).rejects.toThrow("Instagram container creation failed: 400");
  });

  it("throws when publish fails", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ id: "container-1" }))
      .mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(
      adapter.post("token", { body: "x", mediaUrls: ["u"] })
    ).rejects.toThrow("Instagram publish failed: 500");
  });
});

describe("InstagramAdapter.fetchEngagement", () => {
  const adapter = new InstagramAdapter();

  it("aggregates insight metrics and computes engagement rate", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        data: [
          { name: "likes", values: [{ value: 50 }] },
          { name: "comments", values: [{ value: 30 }] },
          { name: "shares", values: [{ value: 20 }] },
          { name: "reach", values: [{ value: 500 }] },
          { name: "impressions", values: [{ value: 1000 }] },
        ],
      })
    );

    const result = await adapter.fetchEngagement("post-1", "token");
    expect(result).not.toBeNull();
    expect(result!.likes).toBe(50);
    expect(result!.comments).toBe(30);
    expect(result!.shares).toBe(20);
    expect(result!.reach).toBe(500);
    expect(result!.impressions).toBe(1000);
    // (50+30+20)/1000 * 100 = 10.00
    expect(result!.engagementRate).toBe("10.00");
    expect(result!.recordedAt).toBeInstanceOf(Date);
  });

  it("returns null engagementRate when impressions are zero", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ data: [{ name: "likes", values: [{ value: 5 }] }] })
    );
    const result = await adapter.fetchEngagement("post-1", "token");
    expect(result!.impressions).toBe(0);
    expect(result!.engagementRate).toBeNull();
  });

  it("defaults missing metrics to 0", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    const result = await adapter.fetchEngagement("post-1", "token");
    expect(result!.likes).toBe(0);
    expect(result!.comments).toBe(0);
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
      "Instagram engagement fetch failed: 500"
    );
  });
});
