import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstagramAdapter } from "../instagram";
import { AuthExpiredError, RateLimitError } from "../types";

describe("InstagramAdapter.fetchEngagement", () => {
  let adapter: InstagramAdapter;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    adapter = new InstagramAdapter();
  });

  const postId = "17895695668004550";
  const accessToken = "test_token_123";

  const mockInsightsResponse = {
    data: [
      { name: "impressions", values: [{ value: 1200 }] },
      { name: "reach", values: [{ value: 800 }] },
      { name: "likes", values: [{ value: 150 }] },
      { name: "comments", values: [{ value: 25 }] },
      { name: "shares", values: [{ value: 10 }] },
      { name: "saved", values: [{ value: 30 }] },
    ],
  };

  it("returns correct engagement shape from Instagram API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockInsightsResponse),
    });

    const result = await adapter.fetchEngagement(postId, accessToken);

    expect(result.likes).toBe(150);
    expect(result.comments).toBe(25);
    expect(result.shares).toBe(10);
    expect(result.reach).toBe(800);
    expect(result.impressions).toBe(1200);
    expect(result.engagementRate).toBe("15.42");
    expect(result.recordedAt).toBeInstanceOf(Date);
  });

  it("calls the correct Instagram Graph API endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockInsightsResponse),
    });

    await adapter.fetchEngagement(postId, accessToken);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`https://graph.instagram.com/${postId}/insights`)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`access_token=${accessToken}`)
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
      status: 500,
    });

    await expect(adapter.fetchEngagement(postId, accessToken)).rejects.toThrow(
      "Instagram engagement fetch failed: 500"
    );
  });

  it("handles missing metrics gracefully with zero defaults", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [
            { name: "impressions", values: [{ value: 500 }] },
            { name: "reach", values: [{ value: 300 }] },
          ],
        }),
    });

    const result = await adapter.fetchEngagement(postId, accessToken);

    expect(result.likes).toBe(0);
    expect(result.comments).toBe(0);
    expect(result.shares).toBe(0);
    expect(result.reach).toBe(300);
    expect(result.impressions).toBe(500);
    expect(result.engagementRate).toBe("0.00");
  });

  it("returns null engagementRate when impressions is zero", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });

    const result = await adapter.fetchEngagement(postId, accessToken);

    expect(result.impressions).toBe(0);
    expect(result.engagementRate).toBeNull();
  });
});
