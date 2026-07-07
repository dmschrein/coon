import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { TwitterAdapter } from "../twitter";
import { AuthExpiredError, RateLimitError } from "../types";

const TWEETS_URL = "https://api.twitter.com/2/tweets";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const adapter = new TwitterAdapter();

describe("TwitterAdapter.publish", () => {
  it("returns a tweet ID string on success", async () => {
    server.use(
      http.post(TWEETS_URL, () => HttpResponse.json({ data: { id: "123" } }))
    );

    const id = await adapter.publish("token", { text: "hello world" });

    expect(id).toBe("123");
  });

  it("throws RateLimitError with retry_after from headers on 429", async () => {
    server.use(
      http.post(
        TWEETS_URL,
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: { "retry-after": "42" },
          })
      )
    );

    const error = await adapter
      .publish("token", { text: "hello" })
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(42);
  });

  it("throws AuthExpiredError on 401", async () => {
    server.use(
      http.post(TWEETS_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(adapter.publish("token", { text: "hello" })).rejects.toThrow(
      AuthExpiredError
    );
  });
});

describe("TwitterAdapter.publishThread", () => {
  it("creates 3 linked tweets where each reply points to the previous tweet", async () => {
    const bodies: Array<{
      text: string;
      reply?: { in_reply_to_tweet_id: string };
    }> = [];

    server.use(
      http.post(TWEETS_URL, async ({ request }) => {
        const body = (await request.json()) as (typeof bodies)[number];
        bodies.push(body);
        return HttpResponse.json({ data: { id: `tweet-${bodies.length}` } });
      })
    );

    const ids = await adapter.publishThread("token", [
      "first tweet",
      "second tweet",
      "third tweet",
    ]);

    expect(ids).toEqual(["tweet-1", "tweet-2", "tweet-3"]);
    expect(bodies).toHaveLength(3);
    expect(bodies[0].text).toBe("first tweet");
    expect(bodies[0].reply).toBeUndefined();
    expect(bodies[1].reply?.in_reply_to_tweet_id).toBe("tweet-1");
    expect(bodies[2].reply?.in_reply_to_tweet_id).toBe("tweet-2");
  });
});

describe("TwitterAdapter.fetchEngagement", () => {
  it("maps all 4 metrics from public_metrics", async () => {
    let requestedUrl = "";
    server.use(
      http.get(`${TWEETS_URL}/tweet-1`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          data: {
            public_metrics: {
              like_count: 10,
              retweet_count: 5,
              reply_count: 3,
              impression_count: 1000,
            },
          },
        });
      })
    );

    const result = await adapter.fetchEngagement("tweet-1", "token");

    expect(requestedUrl).toContain("tweet.fields=public_metrics");
    expect(result).not.toBeNull();
    expect(result!.likes).toBe(10);
    expect(result!.shares).toBe(5);
    expect(result!.comments).toBe(3);
    expect(result!.impressions).toBe(1000);
    expect(result!.recordedAt).toBeInstanceOf(Date);
  });

  it("throws AuthExpiredError on 401", async () => {
    server.use(
      http.get(
        `${TWEETS_URL}/tweet-1`,
        () => new HttpResponse(null, { status: 401 })
      )
    );

    await expect(adapter.fetchEngagement("tweet-1", "token")).rejects.toThrow(
      AuthExpiredError
    );
  });

  it("throws RateLimitError with retry_after on 429", async () => {
    server.use(
      http.get(
        `${TWEETS_URL}/tweet-1`,
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: { "retry-after": "7" },
          })
      )
    );

    const error = await adapter
      .fetchEngagement("tweet-1", "token")
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfter).toBe(7);
  });
});

describe("TwitterAdapter.validateContent", () => {
  it("returns an error result when text exceeds 280 characters", () => {
    const result = adapter.validateContent("x".repeat(281));

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns a valid result when text is exactly 280 characters", () => {
    const result = adapter.validateContent("x".repeat(280));

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("TwitterAdapter.refreshAccessToken (refresh token flow)", () => {
  it("sends a POST with grant_type = 'refresh_token'", async () => {
    let captured: URLSearchParams | null = null;
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        captured = new URLSearchParams(await request.text());
        return HttpResponse.json({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 7200,
        });
      })
    );

    const result = await adapter.refreshAccessToken("old-refresh");

    expect(captured).not.toBeNull();
    expect(captured!.get("grant_type")).toBe("refresh_token");
    expect(captured!.get("refresh_token")).toBe("old-refresh");
    expect(result.accessToken).toBe("new-access");
    expect(result.refreshToken).toBe("new-refresh");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});
