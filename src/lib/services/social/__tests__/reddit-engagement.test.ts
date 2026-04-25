import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedditAdapter } from "../reddit";
import { AuthExpiredError, RateLimitError } from "../types";

describe("RedditAdapter.fetchEngagement", () => {
  let adapter: RedditAdapter;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    adapter = new RedditAdapter();
  });

  const postId = "1abc2de";
  const accessToken = "test_bearer_token";

  const mockRedditResponse = {
    data: {
      children: [
        {
          kind: "t3",
          data: {
            id: postId,
            ups: 342,
            num_comments: 87,
            num_crossposts: 5,
            score: 342,
            title: "Test post",
            author: "testuser",
          },
        },
      ],
    },
  };

  it("returns correct engagement shape from Reddit API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockRedditResponse),
    });

    const result = await adapter.fetchEngagement(postId, accessToken);

    expect(result).not.toBeNull();
    expect(result!.likes).toBe(342);
    expect(result!.comments).toBe(87);
    expect(result!.shares).toBe(5);
    expect(result!.reach).toBe(0);
    expect(result!.impressions).toBe(0);
    expect(result!.engagementRate).toBeNull();
    expect(result!.recordedAt).toBeInstanceOf(Date);
  });

  it("calls correct Reddit API endpoint with bearer token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockRedditResponse),
    });

    await adapter.fetchEngagement(postId, accessToken);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://oauth.reddit.com/api/info?id=t3_${postId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${accessToken}`,
        }),
      })
    );
  });

  it("throws AuthExpiredError on 401 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(adapter.fetchEngagement(postId, accessToken)).rejects.toThrow(
      AuthExpiredError
    );
  });

  it("throws RateLimitError on 429 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    await expect(adapter.fetchEngagement(postId, accessToken)).rejects.toThrow(
      RateLimitError
    );
  });

  it("throws generic error on other HTTP failures", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(adapter.fetchEngagement(postId, accessToken)).rejects.toThrow(
      "Reddit engagement fetch failed: 503"
    );
  });

  it("returns null when listing is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { children: [] } }),
    });

    const result = await adapter.fetchEngagement(postId, accessToken);
    expect(result).toBeNull();
  });

  it("returns null for deleted/removed posts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            children: [
              {
                kind: "t3",
                data: {
                  id: postId,
                  ups: 0,
                  num_comments: 0,
                  num_crossposts: 0,
                  removed_by_category: "moderator",
                },
              },
            ],
          },
        }),
    });

    const result = await adapter.fetchEngagement(postId, accessToken);
    expect(result).toBeNull();
  });

  it("handles zero upvotes gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
            children: [
              {
                kind: "t3",
                data: {
                  id: postId,
                  ups: 0,
                  num_comments: 0,
                  num_crossposts: 0,
                },
              },
            ],
          },
        }),
    });

    const result = await adapter.fetchEngagement(postId, accessToken);

    expect(result).not.toBeNull();
    expect(result!.likes).toBe(0);
    expect(result!.comments).toBe(0);
    expect(result!.shares).toBe(0);
  });
});
