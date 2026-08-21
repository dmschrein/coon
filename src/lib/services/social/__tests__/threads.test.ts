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
import { ThreadsAdapter } from "../threads";
import { AuthExpiredError, RateLimitError } from "../types";
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

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetConnectedAccounts = vi.fn();
const mockConnectViaLinkedAccount = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    publishService: {
      getConnectedAccounts: (...args: unknown[]) =>
        mockGetConnectedAccounts(...args),
      connectViaLinkedAccount: (...args: unknown[]) =>
        mockConnectViaLinkedAccount(...args),
    },
  }),
}));

import { POST as connectThreads } from "@/app/api/accounts/connect/threads/route";

const TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const LONG_LIVED_URL = "https://graph.threads.net/access_token";
const ME_URL = "https://graph.threads.net/v1.0/me";
const CREATE_URL = "https://graph.threads.net/v1.0/me/threads";
const PUBLISH_URL = "https://graph.threads.net/v1.0/me/threads_publish";
const INSIGHTS_URL = "https://graph.threads.net/v1.0/:postId/insights";
const POST_URL = "https://graph.threads.net/v1.0/:postId";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

const adapter = new ThreadsAdapter();

interface ContainerBody {
  media_type: string;
  text: string;
}

interface PublishBody {
  creation_id: string;
}

function useAccountHandler() {
  server.use(
    http.get(ME_URL, () =>
      HttpResponse.json({
        id: "th-user-1",
        username: "maker_studio",
        threads_profile_picture_url: "https://cdn.threads.net/avatar.jpg",
      })
    )
  );
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

describe("ThreadsAdapter.getAuthUrl", () => {
  it("authorizes against threads.net with the basic and content-publish scopes", () => {
    const url = adapter.getAuthUrl(
      "http://localhost:3000/api/accounts/callback/threads",
      "state-123"
    );
    const parsed = new URL(url);

    expect(url).toContain("https://www.threads.net/oauth/authorize");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(
      "threads_basic,threads_content_publish"
    );
    expect(parsed.searchParams.get("state")).toBe("state-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/accounts/callback/threads"
    );
  });
});

describe("ThreadsAdapter.exchangeCode", () => {
  it("swaps the code for a short-lived token, upgrades it to long-lived, and returns the account", async () => {
    let longLivedQuery: URLSearchParams | null = null;
    server.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json({ access_token: "th-short", user_id: "th-user-1" })
      ),
      http.get(LONG_LIVED_URL, ({ request }) => {
        longLivedQuery = new URL(request.url).searchParams;
        return HttpResponse.json({
          access_token: "th-long",
          expires_in: 5184000,
        });
      })
    );
    useAccountHandler();

    const result = await adapter.exchangeCode(
      "auth-code",
      "http://localhost:3000/api/accounts/callback/threads"
    );

    expect(longLivedQuery!.get("grant_type")).toBe("th_exchange_token");
    expect(longLivedQuery!.get("access_token")).toBe("th-short");
    expect(result.accessToken).toBe("th-long");
    expect(result.accountId).toBe("th-user-1");
    expect(result.accountName).toBe("maker_studio");
    expect(result.scopes).toEqual(["threads_basic", "threads_content_publish"]);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});

// ─── Two-step publish ─────────────────────────────────────────────────────────

describe("ThreadsAdapter.publish", () => {
  it("creates a TEXT container then publishes it, returning the post id", async () => {
    let containerBody: ContainerBody | null = null;
    let publishBody: PublishBody | null = null;
    server.use(
      http.post(CREATE_URL, async ({ request }) => {
        containerBody = (await request.json()) as ContainerBody;
        return HttpResponse.json({ id: "container-42" });
      }),
      http.post(PUBLISH_URL, async ({ request }) => {
        publishBody = (await request.json()) as PublishBody;
        return HttpResponse.json({ id: "post-99" });
      })
    );

    const postId = await adapter.publish("token", "Shipping the beta today");

    expect(containerBody!.media_type).toBe("TEXT");
    expect(containerBody!.text).toBe("Shipping the beta today");
    expect(publishBody!.creation_id).toBe("container-42");
    expect(postId).toBe("post-99");
    expect(typeof postId).toBe("string");
  });

  it("throws when the publish step fails after the container was created", async () => {
    server.use(
      http.post(CREATE_URL, () => HttpResponse.json({ id: "container-42" })),
      http.post(PUBLISH_URL, () => new HttpResponse(null, { status: 500 }))
    );

    await expect(adapter.publish("token", "half-posted")).rejects.toThrow(
      /publish/i
    );
  });
});

describe("ThreadsAdapter.post", () => {
  it("returns the published post id and url", async () => {
    server.use(
      http.post(CREATE_URL, () => HttpResponse.json({ id: "container-7" })),
      http.post(PUBLISH_URL, () => HttpResponse.json({ id: "post-7" })),
      http.get(POST_URL, () =>
        HttpResponse.json({
          permalink: "https://www.threads.net/@maker_studio/post/abc123",
        })
      )
    );

    const result = await adapter.post("token", {
      body: "Launch day",
      hashtags: ["build"],
    });

    expect(result.externalPostId).toBe("post-7");
    expect(result.externalPostUrl).toBe(
      "https://www.threads.net/@maker_studio/post/abc123"
    );
  });

  it("still reports the post as published when the permalink lookup fails", async () => {
    server.use(
      http.post(CREATE_URL, () => HttpResponse.json({ id: "container-8" })),
      http.post(PUBLISH_URL, () => HttpResponse.json({ id: "post-8" })),
      http.get(POST_URL, () => new HttpResponse(null, { status: 500 }))
    );

    const result = await adapter.post("token", { body: "Launch day" });

    expect(result.externalPostId).toBe("post-8");
    expect(result.externalPostUrl).toContain("post-8");
  });
});

describe("Threads publish is all-or-nothing", () => {
  function makeService() {
    const contentRepo = {
      findById: vi.fn().mockResolvedValue({
        id: "content-1",
        userId: "user-1",
        platform: "threads",
        approvalStatus: "approved",
        title: null,
        body: "Shipping the beta today",
        contentData: {},
      }),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as CampaignContentRepository;

    const accountRepo = {
      findByUserAndPlatformWithTokens: vi.fn().mockResolvedValue({
        id: "acct-1",
        userId: "user-1",
        platform: "threads",
        accessTokenEncrypted: "enc(th-long)",
        metadata: null,
      }),
    } as unknown as ConnectedAccountRepository;

    const service = new PublishService(
      accountRepo,
      contentRepo,
      (() => adapter) as unknown as (p: string) => SocialPlatformAdapter | null
    );
    return { service, contentRepo };
  }

  it("saves no state when the container is created but the publish step fails", async () => {
    let containerRequests = 0;
    server.use(
      http.post(CREATE_URL, () => {
        containerRequests += 1;
        return HttpResponse.json({ id: "container-42" });
      }),
      http.post(PUBLISH_URL, () => new HttpResponse(null, { status: 500 }))
    );
    const { service, contentRepo } = makeService();

    const result = await service.publishContent("user-1", "content-1");

    expect(containerRequests).toBe(1);
    expect(result.status).toBe("failed");
    expect(result.externalPostId).toBeUndefined();
    expect(contentRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("marks the content complete only when both steps succeed", async () => {
    server.use(
      http.post(CREATE_URL, () => HttpResponse.json({ id: "container-42" })),
      http.post(PUBLISH_URL, () => HttpResponse.json({ id: "post-99" })),
      http.get(POST_URL, () =>
        HttpResponse.json({
          permalink: "https://www.threads.net/@maker_studio/post/xyz789",
        })
      )
    );
    const { service, contentRepo } = makeService();

    const result = await service.publishContent("user-1", "content-1");

    expect(result.status).toBe("published");
    expect(result.externalPostId).toBe("post-99");
    expect(contentRepo.updateStatus).toHaveBeenCalledWith(
      "content-1",
      "complete"
    );
  });
});

// ─── Engagement ───────────────────────────────────────────────────────────────

describe("ThreadsAdapter.fetchEngagement", () => {
  it("requests and maps all four Threads metrics", async () => {
    let query: URLSearchParams | null = null;
    server.use(
      http.get(INSIGHTS_URL, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          data: [
            { name: "likes", period: "lifetime", total_value: { value: 120 } },
            { name: "replies", period: "lifetime", total_value: { value: 14 } },
            { name: "reposts", period: "lifetime", total_value: { value: 9 } },
            { name: "views", period: "lifetime", total_value: { value: 3000 } },
          ],
        });
      })
    );

    const result = await adapter.fetchEngagement("post-99", "token");

    expect(query!.get("metric")).toBe("likes,replies,reposts,views");
    expect(result).not.toBeNull();
    expect(result!.likes).toBe(120);
    expect(result!.replies).toBe(14);
    expect(result!.reposts).toBe(9);
    expect(result!.views).toBe(3000);
    // Mapped onto the shared engagement shape the analytics tables store
    expect(result!.comments).toBe(14);
    expect(result!.shares).toBe(9);
    expect(result!.impressions).toBe(3000);
    expect(result!.engagementRate).toBe("4.77");
    expect(result!.recordedAt).toBeInstanceOf(Date);
  });

  it("reads insight values from the legacy values[] shape", async () => {
    server.use(
      http.get(INSIGHTS_URL, () =>
        HttpResponse.json({
          data: [
            { name: "likes", values: [{ value: 5 }] },
            { name: "replies", values: [{ value: 1 }] },
            { name: "reposts", values: [{ value: 2 }] },
            { name: "views", values: [{ value: 100 }] },
          ],
        })
      )
    );

    const result = await adapter.fetchEngagement("post-99", "token");

    expect(result!.likes).toBe(5);
    expect(result!.views).toBe(100);
  });

  it("throws AuthExpiredError when the API responds with 401", async () => {
    server.use(
      http.get(INSIGHTS_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(adapter.fetchEngagement("post-99", "token")).rejects.toThrow(
      AuthExpiredError
    );
  });

  it("throws RateLimitError carrying retry-after when the API responds with 429", async () => {
    server.use(
      http.get(
        INSIGHTS_URL,
        () =>
          new HttpResponse(null, {
            status: 429,
            headers: { "retry-after": "45" },
          })
      )
    );

    await expect(
      adapter.fetchEngagement("post-99", "token")
    ).rejects.toMatchObject({ name: "RateLimitError", retryAfter: 45 });
    await expect(adapter.fetchEngagement("post-99", "token")).rejects.toThrow(
      RateLimitError
    );
  });
});

// ─── Instagram shortcut ───────────────────────────────────────────────────────

describe("POST /api/accounts/connect/threads", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await connectThreads();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("offers the Connect with Instagram shortcut when Instagram is already connected", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConnectedAccounts.mockResolvedValue([
      { id: "acct-ig", platform: "instagram", isActive: true },
    ]);

    const res = await connectThreads();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.authUrl).toContain(
      "https://www.threads.net/oauth/authorize"
    );
    expect(json.data.instagramShortcut.available).toBe(true);
    expect(json.data.instagramShortcut.endpoint).toBe(
      "/api/accounts/connect/threads/instagram"
    );
  });

  it("omits the shortcut when no Instagram account is connected", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConnectedAccounts.mockResolvedValue([
      { id: "acct-rd", platform: "reddit", isActive: true },
    ]);

    const res = await connectThreads();
    const json = await res.json();

    expect(json.data.instagramShortcut.available).toBe(false);
    expect(json.data.instagramShortcut.endpoint).toBeNull();
  });
});

describe("PublishService.connectViaLinkedAccount", () => {
  it("exchanges the stored Instagram token for a Threads token and saves the account", async () => {
    let exchangeQuery: URLSearchParams | null = null;
    server.use(
      http.get(LONG_LIVED_URL, ({ request }) => {
        exchangeQuery = new URL(request.url).searchParams;
        return HttpResponse.json({
          access_token: "th-from-ig",
          expires_in: 5184000,
        });
      })
    );
    useAccountHandler();

    const accountRepo = {
      findByUserAndPlatformWithTokens: vi.fn().mockResolvedValue({
        id: "acct-ig",
        userId: "user-1",
        platform: "instagram",
        accessTokenEncrypted: "enc(ig-long)",
        metadata: null,
      }),
      findByUserAndPlatform: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "acct-th" }),
    } as unknown as ConnectedAccountRepository;

    const service = new PublishService(
      accountRepo,
      {} as CampaignContentRepository,
      (() => adapter) as unknown as (p: string) => SocialPlatformAdapter | null
    );

    const account = await service.connectViaLinkedAccount("user-1", "threads");

    expect(exchangeQuery!.get("access_token")).toBe("ig-long");
    expect(accountRepo.findByUserAndPlatformWithTokens).toHaveBeenCalledWith(
      "user-1",
      "instagram"
    );
    expect(accountRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        platform: "threads",
        accessTokenEncrypted: "enc(th-from-ig)",
        accountName: "maker_studio",
      })
    );
    expect(account.id).toBe("acct-th");
  });

  it("rejects when the source Instagram account is not connected", async () => {
    const accountRepo = {
      findByUserAndPlatformWithTokens: vi.fn().mockResolvedValue(null),
    } as unknown as ConnectedAccountRepository;

    const service = new PublishService(
      accountRepo,
      {} as CampaignContentRepository,
      (() => adapter) as unknown as (p: string) => SocialPlatformAdapter | null
    );

    await expect(
      service.connectViaLinkedAccount("user-1", "threads")
    ).rejects.toThrow(/instagram/i);
  });
});
