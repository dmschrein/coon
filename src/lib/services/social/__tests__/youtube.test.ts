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
import { YouTubeAdapter } from "../youtube";
import { AuthExpiredError, SubscriberThresholdError } from "../types";
import { PublishService } from "@/lib/core/services/publish-service";
import type {
  ConnectedAccountRepository,
  CampaignContentRepository,
} from "@/lib/core/repositories/interfaces";
import type { SocialPlatformAdapter } from "../types";

vi.mock("@/lib/crypto", () => ({
  encrypt: (s: string) => `enc(${s})`,
  decrypt: (s: string) => s.replace(/^enc\(/, "").replace(/\)$/, ""),
}));

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const ACTIVITIES_URL = "https://www.googleapis.com/youtube/v3/activities";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const adapter = new YouTubeAdapter();

interface ActivityBody {
  snippet: { description: string };
  contentDetails: {
    bulletin: { resourceId: { kind: string; channelId: string } };
  };
}

describe("YouTubeAdapter.getAuthUrl", () => {
  it("requests offline access with the upload and readonly scopes", () => {
    const url = adapter.getAuthUrl(
      "http://localhost:3000/api/accounts/callback/youtube",
      "state-123"
    );
    const parsed = new URL(url);

    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(
      "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
    );
    // Google only issues a refresh_token with offline access + forced consent
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(parsed.searchParams.get("state")).toBe("state-123");
    // Confidential web-server client — no PKCE challenge
    expect(parsed.searchParams.get("code_challenge")).toBeNull();
  });
});

describe("YouTubeAdapter.fetchEngagement", () => {
  it("returns viewCount, likeCount, and commentCount mapped from video statistics", async () => {
    let query: URLSearchParams | null = null;
    server.use(
      http.get(VIDEOS_URL, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          items: [
            {
              id: "vid-1",
              statistics: {
                viewCount: "1000",
                likeCount: "50",
                commentCount: "10",
              },
            },
          ],
        });
      })
    );

    const result = await adapter.fetchEngagement("vid-1", "token");

    expect(query!.get("id")).toBe("vid-1");
    expect(query!.get("part")).toBe("statistics");
    expect(result).not.toBeNull();
    expect(result!.likes).toBe(50);
    expect(result!.comments).toBe(10);
    expect(result!.shares).toBe(0);
    // viewCount maps to both reach and impressions — the videos endpoint
    // does not distinguish unique vs. total views
    expect(result!.reach).toBe(1000);
    expect(result!.impressions).toBe(1000);
    expect(result!.engagementRate).toBe("6.00");
    expect(result!.recordedAt).toBeInstanceOf(Date);
  });

  it("throws AuthExpiredError when the API responds with 401", async () => {
    server.use(
      http.get(VIDEOS_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(adapter.fetchEngagement("vid-1", "token")).rejects.toThrow(
      AuthExpiredError
    );
  });

  it("returns null when the video is not found (deleted or private)", async () => {
    server.use(http.get(VIDEOS_URL, () => HttpResponse.json({ items: [] })));

    const result = await adapter.fetchEngagement("gone", "token");

    expect(result).toBeNull();
  });
});

describe("YouTubeAdapter.post — subscriber threshold", () => {
  it("throws SubscriberThresholdError on 403 forbiddenForAccount", async () => {
    server.use(
      http.post(ACTIVITIES_URL, () =>
        HttpResponse.json(
          { error: { errors: [{ reason: "forbiddenForAccount" }] } },
          { status: 403 }
        )
      )
    );

    const attempt = () =>
      adapter.post("token", { body: "hi" }, { channel_id: "UC123" });

    await expect(attempt()).rejects.toThrow(SubscriberThresholdError);
    await expect(attempt()).rejects.toThrow(
      "YouTube Community posts require 1000+ subscribers"
    );
  });

  it("throws a generic error on 403 without the forbiddenForAccount reason", async () => {
    server.use(
      http.post(ACTIVITIES_URL, () =>
        HttpResponse.json(
          { error: { errors: [{ reason: "quotaExceeded" }] } },
          { status: 403 }
        )
      )
    );

    const attempt = adapter.post(
      "token",
      { body: "hi" },
      { channel_id: "UC123" }
    );

    await expect(attempt).rejects.toThrow("YouTube publish failed: 403");
    await expect(attempt).rejects.not.toThrow(SubscriberThresholdError);
  });
});

describe("YouTubeAdapter.post — uses stored channel_id", () => {
  it("reads channel_id from account metadata during publish (no refetch)", async () => {
    let body: ActivityBody | null = null;
    // Only the activities handler is registered — any /channels refetch
    // would trip onUnhandledRequest: "error".
    server.use(
      http.post(ACTIVITIES_URL, async ({ request }) => {
        body = (await request.json()) as ActivityBody;
        return HttpResponse.json({ id: "act-1" });
      })
    );

    // Spy on the metadata read to prove channel_id comes from stored metadata
    const channelIdRead = vi.fn(() => "UC-stored-7");
    const metadata: Record<string, unknown> = {};
    Object.defineProperty(metadata, "channel_id", {
      get: channelIdRead,
      enumerable: true,
    });

    const result = await adapter.post(
      "token",
      { body: "post body", hashtags: ["launch"] },
      metadata
    );

    expect(channelIdRead).toHaveBeenCalled();
    expect(body!.contentDetails.bulletin.resourceId.channelId).toBe(
      "UC-stored-7"
    );
    expect(body!.contentDetails.bulletin.resourceId.kind).toBe(
      "youtube#channel"
    );
    expect(body!.snippet.description).toBe("post body\n\n#launch");
    expect(result.externalPostId).toBe("act-1");
  });

  it("rejects with a reconnect message when channel_id is missing", async () => {
    // No handlers registered — an HTTP call would trip onUnhandledRequest
    await expect(adapter.post("token", { body: "hi" }, {})).rejects.toThrow(
      /reconnect/i
    );
  });
});

describe("YouTubeAdapter.exchangeCode", () => {
  function useOAuthHandlers() {
    let channelsQuery: URLSearchParams | null = null;
    server.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json({
          access_token: "yt-at",
          refresh_token: "yt-rt",
          expires_in: 3599,
        })
      ),
      http.get(CHANNELS_URL, ({ request }) => {
        channelsQuery = new URL(request.url).searchParams;
        return HttpResponse.json({
          items: [
            {
              id: "UC123",
              snippet: {
                title: "My Channel",
                thumbnails: { default: { url: "https://yt.img/a.jpg" } },
              },
            },
          ],
        });
      })
    );
    return () => channelsQuery;
  }

  it("fetches the channel via GET /channels?mine=true and returns channel_id in metadata", async () => {
    const getChannelsQuery = useOAuthHandlers();

    const result = await adapter.exchangeCode(
      "auth-code",
      "http://localhost:3000/api/accounts/callback/youtube"
    );

    expect(getChannelsQuery()!.get("mine")).toBe("true");
    expect(result.metadata).toEqual({ channel_id: "UC123" });
    expect(result.accountId).toBe("UC123");
    expect(result.accountName).toBe("My Channel");
    expect(result.profileImageUrl).toBe("https://yt.img/a.jpg");
    expect(result.accessToken).toBe("yt-at");
    expect(result.refreshToken).toBe("yt-rt");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("stores channel_id in connected_accounts metadata during the OAuth callback", async () => {
    useOAuthHandlers();

    const accountRepo = {
      findByUserAndPlatform: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    } as unknown as ConnectedAccountRepository;
    const service = new PublishService(
      accountRepo,
      {} as CampaignContentRepository,
      (() => adapter) as unknown as (p: string) => SocialPlatformAdapter | null
    );

    await service.handleOAuthCallback(
      "user-1",
      "youtube",
      "auth-code",
      "http://localhost:3000/api/accounts/callback/youtube"
    );

    expect(accountRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ channel_id: "UC123" }),
      })
    );
  });
});

describe("YouTubeAdapter.refreshAccessToken", () => {
  it("POSTs grant_type=refresh_token to the Google token endpoint", async () => {
    let params: URLSearchParams | null = null;
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        params = new URLSearchParams(await request.text());
        // Google omits refresh_token in refresh responses
        return HttpResponse.json({ access_token: "new-at", expires_in: 3599 });
      })
    );

    const result = await adapter.refreshAccessToken!("old-rt");

    expect(params!.get("grant_type")).toBe("refresh_token");
    expect(params!.get("refresh_token")).toBe("old-rt");
    expect(result.accessToken).toBe("new-at");
    // The incoming refresh token must be echoed back — returning undefined
    // would wipe the stored refresh token in PublishService.updateTokens
    expect(result.refreshToken).toBe("old-rt");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("throws AuthExpiredError when the token endpoint responds with 401", async () => {
    server.use(
      http.post(TOKEN_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(adapter.refreshAccessToken!("old-rt")).rejects.toThrow(
      AuthExpiredError
    );
  });
});
