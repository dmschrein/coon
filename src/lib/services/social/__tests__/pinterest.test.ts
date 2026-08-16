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
import { PinterestAdapter } from "../pinterest";
import { AuthExpiredError } from "../types";
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

const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const USER_ACCOUNT_URL = "https://api.pinterest.com/v5/user_account";
const BOARDS_URL = "https://api.pinterest.com/v5/boards";
const PINS_URL = "https://api.pinterest.com/v5/pins";
const PIN_URL = "https://api.pinterest.com/v5/pins/:pinId";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const adapter = new PinterestAdapter();

interface PinBody {
  board_id: string;
  title?: string;
  description?: string;
  link?: string;
  media_source: { source_type: string; url: string };
}

interface BoardsMetadata {
  boards: { id: string; name: string }[];
  boards_cached_at: string;
}

function useOAuthHandlers() {
  let boardsRequested = 0;
  server.use(
    http.post(TOKEN_URL, () =>
      HttpResponse.json({
        access_token: "pin-at",
        refresh_token: "pin-rt",
        expires_in: 2592000,
      })
    ),
    http.get(USER_ACCOUNT_URL, () =>
      HttpResponse.json({
        id: "user-9",
        username: "maker_studio",
        profile_image: "https://i.pinimg.com/avatar.jpg",
      })
    ),
    http.get(BOARDS_URL, () => {
      boardsRequested += 1;
      return HttpResponse.json({
        items: [
          { id: "board-1", name: "Recipes" },
          { id: "board-2", name: "Travel" },
        ],
      });
    })
  );
  return () => boardsRequested;
}

describe("PinterestAdapter.getAuthUrl", () => {
  it("authorizes against pinterest.com/oauth/ with the board, pin, and account scopes", () => {
    const url = adapter.getAuthUrl(
      "http://localhost:3000/api/accounts/callback/pinterest",
      "state-123"
    );
    const parsed = new URL(url);

    expect(url).toContain("https://www.pinterest.com/oauth/");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(
      "boards:read,pins:write,user_accounts:read"
    );
    expect(parsed.searchParams.get("state")).toBe("state-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/accounts/callback/pinterest"
    );
  });
});

describe("PinterestAdapter.exchangeCode", () => {
  it("fetches the board list from GET /v5/boards and returns it in metadata with a cache timestamp", async () => {
    const getBoardsRequested = useOAuthHandlers();

    const result = await adapter.exchangeCode(
      "auth-code",
      "http://localhost:3000/api/accounts/callback/pinterest"
    );

    expect(getBoardsRequested()).toBe(1);
    const metadata = result.metadata as unknown as BoardsMetadata;
    expect(metadata.boards).toEqual([
      { id: "board-1", name: "Recipes" },
      { id: "board-2", name: "Travel" },
    ]);
    expect(Date.parse(metadata.boards_cached_at)).not.toBeNaN();
    expect(result.accessToken).toBe("pin-at");
    expect(result.refreshToken).toBe("pin-rt");
    expect(result.accountId).toBe("user-9");
    expect(result.accountName).toBe("maker_studio");
  });

  it("stores the board list in connected_accounts.metadata during the OAuth callback", async () => {
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
      "pinterest",
      "auth-code",
      "http://localhost:3000/api/accounts/callback/pinterest"
    );

    expect(accountRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: "pinterest",
        metadata: expect.objectContaining({
          boards: [
            { id: "board-1", name: "Recipes" },
            { id: "board-2", name: "Travel" },
          ],
        }),
      })
    );
  });
});

describe("PinterestAdapter.post", () => {
  it("sends a Pin object with board_id, title, description, and an image URL media source", async () => {
    let body: PinBody | null = null;
    let contentType: string | null = null;
    server.use(
      http.post(PINS_URL, async ({ request }) => {
        contentType = request.headers.get("content-type");
        body = (await request.json()) as PinBody;
        return HttpResponse.json({ id: "pin-77" });
      })
    );

    const result = await adapter.post(
      "token",
      {
        title: "Sourdough starter guide",
        body: "Everything you need to keep a starter alive",
        boardId: "board-2",
        link: "https://example.com/sourdough",
        mediaUrls: ["https://cdn.example.com/starter.jpg"],
      },
      { boards: [{ id: "board-1", name: "Recipes" }] }
    );

    // Pins carry a hosted image URL — the v5 API takes no file upload
    expect(contentType).toContain("application/json");
    expect(body!.media_source.source_type).toBe("image_url");
    expect(body!.media_source.url).toBe("https://cdn.example.com/starter.jpg");
    expect(body!.board_id).toBe("board-2");
    expect(body!.title).toBe("Sourdough starter guide");
    expect(body!.description).toBe(
      "Everything you need to keep a starter alive"
    );
    expect(body!.link).toBe("https://example.com/sourdough");
    expect(result.externalPostId).toBe("pin-77");
    expect(result.externalPostUrl).toBe(
      "https://www.pinterest.com/pin/pin-77/"
    );
  });

  it("falls back to the first cached board when the payload carries no boardId", async () => {
    let body: PinBody | null = null;
    server.use(
      http.post(PINS_URL, async ({ request }) => {
        body = (await request.json()) as PinBody;
        return HttpResponse.json({ id: "pin-78" });
      })
    );

    await adapter.post(
      "token",
      { body: "pin body", mediaUrls: ["https://cdn.example.com/a.jpg"] },
      { boards: [{ id: "board-1", name: "Recipes" }] }
    );

    expect(body!.board_id).toBe("board-1");
  });

  it("rejects with a reconnect message when no board is available", async () => {
    // No handlers registered — an HTTP call would trip onUnhandledRequest
    await expect(
      adapter.post(
        "token",
        { body: "pin body", mediaUrls: ["https://cdn.example.com/a.jpg"] },
        { boards: [] }
      )
    ).rejects.toThrow(/board/i);
  });

  it("rejects when the content has no image URL", async () => {
    await expect(
      adapter.post("token", { body: "pin body" }, { boards: [] })
    ).rejects.toThrow(/image/i);
  });
});

describe("PinterestAdapter.fetchEngagement", () => {
  it("maps save_count to shares, click_count to clicks, and impression_count to impressions", async () => {
    let query: URLSearchParams | null = null;
    server.use(
      http.get(PIN_URL, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({
          id: "pin-77",
          pin_metrics: {
            all_time: {
              save_count: 40,
              click_count: 25,
              impression_count: 1000,
            },
          },
        });
      })
    );

    const result = await adapter.fetchEngagement("pin-77", "token");

    expect(query!.get("pin_metrics")).toBe("true");
    expect(result).not.toBeNull();
    expect(result!.shares).toBe(40);
    expect(result!.clicks).toBe(25);
    expect(result!.impressions).toBe(1000);
    expect(result!.engagementRate).toBe("6.50");
    expect(result!.recordedAt).toBeInstanceOf(Date);
  });

  it("throws AuthExpiredError when the API responds with 401", async () => {
    server.use(
      http.get(PIN_URL, () => new HttpResponse(null, { status: 401 }))
    );

    await expect(adapter.fetchEngagement("pin-77", "token")).rejects.toThrow(
      AuthExpiredError
    );
  });

  it("returns null when the pin no longer exists", async () => {
    server.use(
      http.get(PIN_URL, () => new HttpResponse(null, { status: 404 }))
    );

    expect(await adapter.fetchEngagement("gone", "token")).toBeNull();
  });
});

describe("Pinterest board cache", () => {
  const freshMetadata = () => ({
    boards: [{ id: "board-1", name: "Recipes" }],
    boards_cached_at: new Date().toISOString(),
  });
  const staleMetadata = () => ({
    boards: [{ id: "board-1", name: "Recipes" }],
    boards_cached_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  });

  it("treats a cache older than 24 hours as stale and a newer one as fresh", () => {
    expect(adapter.isMetadataStale(staleMetadata())).toBe(true);
    expect(adapter.isMetadataStale(freshMetadata())).toBe(false);
    expect(adapter.isMetadataStale(null)).toBe(true);
    expect(adapter.isMetadataStale({ boards: [] })).toBe(true);
  });

  function makeService(metadata: Record<string, unknown>) {
    const accountRepo = {
      findByUserId: vi.fn().mockResolvedValue([
        {
          id: "acct-1",
          userId: "user-1",
          platform: "pinterest",
          metadata,
        },
      ]),
      findByUserAndPlatformWithTokens: vi.fn().mockResolvedValue({
        id: "acct-1",
        userId: "user-1",
        platform: "pinterest",
        accessTokenEncrypted: "enc(pin-at)",
        metadata,
      }),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConnectedAccountRepository;

    const service = new PublishService(
      accountRepo,
      {} as CampaignContentRepository,
      (() => adapter) as unknown as (p: string) => SocialPlatformAdapter | null
    );
    return { service, accountRepo };
  }

  it("refetches and persists boards when the cached_at timestamp has expired", async () => {
    const getBoardsRequested = useOAuthHandlers();
    const { service, accountRepo } = makeService(staleMetadata());

    const accounts = await service.getConnectedAccounts("user-1");

    expect(getBoardsRequested()).toBe(1);
    expect(accountRepo.updateMetadata).toHaveBeenCalledWith(
      "acct-1",
      expect.objectContaining({
        boards: [
          { id: "board-1", name: "Recipes" },
          { id: "board-2", name: "Travel" },
        ],
      })
    );
    const refreshed = accounts[0].metadata as unknown as BoardsMetadata;
    expect(refreshed.boards).toHaveLength(2);
  });

  it("serves boards from metadata without calling Pinterest while the cache is fresh", async () => {
    // No handlers registered — a boards refetch would trip onUnhandledRequest
    const { service, accountRepo } = makeService(freshMetadata());

    const accounts = await service.getConnectedAccounts("user-1");

    expect(accountRepo.updateMetadata).not.toHaveBeenCalled();
    const cached = accounts[0].metadata as unknown as BoardsMetadata;
    expect(cached.boards).toEqual([{ id: "board-1", name: "Recipes" }]);
  });
});
