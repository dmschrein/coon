import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublishService } from "../publish-service";
import { ServiceError } from "../audience-service";
import type {
  ConnectedAccountRepository,
  CampaignContentRepository,
  ConnectedAccountWithTokens,
} from "../../repositories/interfaces";
import type { ConnectedAccount } from "@/types";
import type { SocialPlatformAdapter } from "@/lib/services/social/types";

vi.mock("@/lib/crypto", () => ({
  encrypt: (s: string) => `enc(${s})`,
  decrypt: (s: string) => s.replace(/^enc\(/, "").replace(/\)$/, ""),
}));

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

function createAccountRepo(): MockRepo<ConnectedAccountRepository> {
  return {
    findByUserId: vi.fn(),
    findByUserAndPlatform: vi.fn(),
    findById: vi.fn(),
    findByIdWithTokens: vi.fn(),
    findByUserAndPlatformWithTokens: vi.fn(),
    findExpiringTokens: vi.fn(),
    create: vi.fn(),
    updateTokens: vi.fn(),
    deactivate: vi.fn(),
    delete: vi.fn(),
  };
}

function createContentRepo(): MockRepo<CampaignContentRepository> {
  return {
    findByCampaignId: vi.fn(),
    findById: vi.fn(),
    createMany: vi.fn(),
    updateStatus: vi.fn(),
    updateContent: vi.fn(),
    updateApprovalStatus: vi.fn(),
    bulkUpdateApprovalStatus: vi.fn(),
    updateBody: vi.fn(),
    updateEnrichments: vi.fn(),
    updateContentPiece: vi.fn(),
    delete: vi.fn(),
    updateSchedule: vi.fn(),
    bulkUpdateSchedule: vi.fn(),
    updateHashtags: vi.fn(),
    updateTargetCommunity: vi.fn(),
    updateLastEngagementFetch: vi.fn(),
    findStalePublished: vi.fn(),
    findRecentByUserId: vi.fn(),
  };
}

const account: ConnectedAccount = {
  id: "acc-1",
  userId: "user-1",
  platform: "twitter",
  accountName: "Test",
  accountId: "tw-1",
  profileImageUrl: null,
  isActive: true,
  tokenExpiresAt: null,
  scopes: ["read"],
  createdAt: new Date(),
};

const accountWithTokens: ConnectedAccountWithTokens = {
  ...account,
  accessTokenEncrypted: "enc(access-tok)",
  refreshTokenEncrypted: "enc(refresh-tok)",
};

function makeAdapter(
  overrides: Partial<SocialPlatformAdapter> = {}
): SocialPlatformAdapter {
  return {
    platform: "twitter",
    post: vi.fn(),
    getAccountInfo: vi.fn(),
    getAuthUrl: vi.fn().mockReturnValue("https://auth.example"),
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn(),
    ...overrides,
  } as unknown as SocialPlatformAdapter;
}

describe("PublishService", () => {
  let accountRepo: MockRepo<ConnectedAccountRepository>;
  let contentRepo: MockRepo<CampaignContentRepository>;
  let adapter: SocialPlatformAdapter;
  let getAdapter: ReturnType<typeof vi.fn>;
  let service: PublishService;

  beforeEach(() => {
    vi.clearAllMocks();
    accountRepo = createAccountRepo();
    contentRepo = createContentRepo();
    adapter = makeAdapter();
    getAdapter = vi.fn().mockReturnValue(adapter);
    service = new PublishService(
      accountRepo as unknown as ConnectedAccountRepository,
      contentRepo as unknown as CampaignContentRepository,
      getAdapter as unknown as (p: string) => SocialPlatformAdapter | null
    );
  });

  describe("getConnectedAccounts", () => {
    it("delegates to repo", async () => {
      accountRepo.findByUserId.mockResolvedValue([account]);
      const result = await service.getConnectedAccounts("user-1");
      expect(result).toEqual([account]);
    });
  });

  describe("getAuthUrl", () => {
    it("returns the adapter auth url", () => {
      const url = service.getAuthUrl("twitter", "https://cb", "state-1");
      expect(url).toBe("https://auth.example");
      expect(adapter.getAuthUrl).toHaveBeenCalledWith("https://cb", "state-1");
    });

    it("throws for an unsupported platform", () => {
      getAdapter.mockReturnValue(null);
      expect(() => service.getAuthUrl("twitter", "r", "s")).toThrow(
        "is not supported"
      );
    });
  });

  describe("handleOAuthCallback", () => {
    it("exchanges code, deactivates existing, and creates account", async () => {
      (adapter.exchangeCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: "at",
        refreshToken: "rt",
        accountId: "tw-1",
        accountName: "Test",
        scopes: ["read"],
      });
      accountRepo.findByUserAndPlatform.mockResolvedValue(account);
      accountRepo.create.mockResolvedValue(account);

      const result = await service.handleOAuthCallback(
        "user-1",
        "twitter",
        "code-123",
        "https://cb"
      );

      expect(adapter.exchangeCode).toHaveBeenCalledWith(
        "code-123",
        "https://cb",
        undefined
      );
      expect(accountRepo.deactivate).toHaveBeenCalledWith("acc-1");
      expect(accountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          platform: "twitter",
          accessTokenEncrypted: "enc(at)",
          refreshTokenEncrypted: "enc(rt)",
        })
      );
      expect(result).toEqual(account);
    });

    it("skips deactivate when there is no existing account and omits refresh token", async () => {
      (adapter.exchangeCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        accessToken: "at",
        accountId: "tw-1",
        accountName: "Test",
      });
      accountRepo.findByUserAndPlatform.mockResolvedValue(null);
      accountRepo.create.mockResolvedValue(account);

      await service.handleOAuthCallback("user-1", "twitter", "code", "r");

      expect(accountRepo.deactivate).not.toHaveBeenCalled();
      expect(accountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenEncrypted: undefined })
      );
    });

    it("throws for unsupported platform", async () => {
      getAdapter.mockReturnValue(null);
      await expect(
        service.handleOAuthCallback("user-1", "twitter", "c", "r")
      ).rejects.toThrow("is not supported");
    });
  });

  describe("connectBotPlatform", () => {
    it("deactivates existing and creates a bot account", async () => {
      accountRepo.findByUserAndPlatform.mockResolvedValue(account);
      accountRepo.create.mockResolvedValue(account);

      await service.connectBotPlatform({
        userId: "user-1",
        platform: "discord",
        accessToken: "bot-tok",
        accountId: "d-1",
        accountName: "Bot",
        metadata: { guild: "g" },
      });

      expect(accountRepo.deactivate).toHaveBeenCalledWith("acc-1");
      expect(accountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accessTokenEncrypted: "enc(bot-tok)",
          accountId: "d-1",
          metadata: { guild: "g" },
        })
      );
    });

    it("does not deactivate when no existing account", async () => {
      accountRepo.findByUserAndPlatform.mockResolvedValue(null);
      accountRepo.create.mockResolvedValue(account);

      await service.connectBotPlatform({
        userId: "user-1",
        platform: "discord",
        accessToken: "bot-tok",
        accountId: "d-1",
        accountName: "Bot",
      });

      expect(accountRepo.deactivate).not.toHaveBeenCalled();
    });
  });

  describe("disconnectAccount", () => {
    it("deactivates an owned account", async () => {
      accountRepo.findById.mockResolvedValue(account);
      await service.disconnectAccount("user-1", "acc-1");
      expect(accountRepo.deactivate).toHaveBeenCalledWith("acc-1");
    });

    it("throws NOT_FOUND when account missing", async () => {
      accountRepo.findById.mockResolvedValue(null);
      await expect(
        service.disconnectAccount("user-1", "acc-1")
      ).rejects.toThrow("Account not found");
    });

    it("throws NOT_FOUND when account belongs to another user", async () => {
      accountRepo.findById.mockResolvedValue({ ...account, userId: "other" });
      await expect(
        service.disconnectAccount("user-1", "acc-1")
      ).rejects.toThrow("Account not found");
    });
  });

  describe("refreshAccountTokens", () => {
    it("refreshes tokens using the refresh token", async () => {
      accountRepo.findByIdWithTokens.mockResolvedValue(accountWithTokens);
      (
        adapter.refreshAccessToken as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ accessToken: "new-at", refreshToken: "new-rt" });
      accountRepo.findById.mockResolvedValue(account);

      const result = await service.refreshAccountTokens("user-1", "acc-1");

      expect(adapter.refreshAccessToken).toHaveBeenCalledWith("refresh-tok");
      expect(accountRepo.updateTokens).toHaveBeenCalledWith(
        "acc-1",
        "enc(new-at)",
        "enc(new-rt)",
        undefined
      );
      expect(result).toEqual(account);
    });

    it("falls back to the access token when there is no refresh token", async () => {
      accountRepo.findByIdWithTokens.mockResolvedValue({
        ...accountWithTokens,
        refreshTokenEncrypted: null,
      });
      (
        adapter.refreshAccessToken as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ accessToken: "new-at" });
      accountRepo.findById.mockResolvedValue(account);

      await service.refreshAccountTokens("user-1", "acc-1");

      expect(adapter.refreshAccessToken).toHaveBeenCalledWith("access-tok");
      expect(accountRepo.updateTokens).toHaveBeenCalledWith(
        "acc-1",
        "enc(new-at)",
        undefined,
        undefined
      );
    });

    it("deactivates and throws when refresh fails", async () => {
      accountRepo.findByIdWithTokens.mockResolvedValue(accountWithTokens);
      (
        adapter.refreshAccessToken as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("revoked"));

      await expect(
        service.refreshAccountTokens("user-1", "acc-1")
      ).rejects.toThrow("Token refresh failed");
      expect(accountRepo.deactivate).toHaveBeenCalledWith("acc-1");
    });

    it("throws NOT_FOUND when the account is missing or not owned", async () => {
      accountRepo.findByIdWithTokens.mockResolvedValue(null);
      await expect(
        service.refreshAccountTokens("user-1", "acc-1")
      ).rejects.toThrow("Account not found");
    });

    it("throws UNSUPPORTED_OPERATION when adapter cannot refresh", async () => {
      accountRepo.findByIdWithTokens.mockResolvedValue(accountWithTokens);
      getAdapter.mockReturnValue(
        makeAdapter({ refreshAccessToken: undefined })
      );
      await expect(
        service.refreshAccountTokens("user-1", "acc-1")
      ).rejects.toThrow("Token refresh not supported");
    });
  });

  describe("publishContent", () => {
    const approvedContent = {
      id: "c-1",
      userId: "user-1",
      platform: "twitter",
      approvalStatus: "approved",
      title: "Hi",
      body: "hello world",
      contentData: { hashtags: ["#a"] },
    };

    it("publishes approved content and marks it complete", async () => {
      contentRepo.findById.mockResolvedValue(approvedContent);
      accountRepo.findByUserAndPlatformWithTokens.mockResolvedValue(
        accountWithTokens
      );
      (adapter.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        externalPostId: "ext-1",
        externalPostUrl: "https://x.com/ext-1",
      });

      const result = await service.publishContent("user-1", "c-1");

      expect(adapter.post).toHaveBeenCalledWith(
        "access-tok",
        expect.objectContaining({ body: "hello world", hashtags: ["#a"] })
      );
      expect(contentRepo.updateStatus).toHaveBeenCalledWith("c-1", "complete");
      expect(result).toEqual({
        contentId: "c-1",
        status: "published",
        externalPostId: "ext-1",
        externalPostUrl: "https://x.com/ext-1",
      });
    });

    it("returns failed result when adapter.post throws", async () => {
      contentRepo.findById.mockResolvedValue(approvedContent);
      accountRepo.findByUserAndPlatformWithTokens.mockResolvedValue(
        accountWithTokens
      );
      (adapter.post as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("rate limited")
      );

      const result = await service.publishContent("user-1", "c-1");

      expect(result).toEqual({
        contentId: "c-1",
        status: "failed",
        error: "rate limited",
      });
      expect(contentRepo.updateStatus).not.toHaveBeenCalled();
    });

    it("builds payload from contentData fallbacks when body/title are null", async () => {
      contentRepo.findById.mockResolvedValue({
        ...approvedContent,
        title: null,
        body: null,
        contentData: {
          title: "DataTitle",
          postBody: "from data",
          mediaUrls: ["u"],
          suggestedSubreddits: ["r/test"],
          targetCommunity: "tc",
        },
      });
      accountRepo.findByUserAndPlatformWithTokens.mockResolvedValue(
        accountWithTokens
      );
      (adapter.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        externalPostId: "ext-2",
        externalPostUrl: "url",
      });

      await service.publishContent("user-1", "c-1");

      expect(adapter.post).toHaveBeenCalledWith(
        "access-tok",
        expect.objectContaining({
          title: "DataTitle",
          body: "from data",
          mediaUrls: ["u"],
          subreddit: "r/test",
          communityTarget: "tc",
        })
      );
    });

    it("throws NOT_FOUND when content missing", async () => {
      contentRepo.findById.mockResolvedValue(null);
      await expect(service.publishContent("user-1", "c-1")).rejects.toThrow(
        "Content not found"
      );
    });

    it("throws UNAUTHORIZED when content owned by another user", async () => {
      contentRepo.findById.mockResolvedValue({
        ...approvedContent,
        userId: "other",
      });
      await expect(service.publishContent("user-1", "c-1")).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("throws NOT_APPROVED when content not approved", async () => {
      contentRepo.findById.mockResolvedValue({
        ...approvedContent,
        approvalStatus: "pending_review",
      });
      await expect(service.publishContent("user-1", "c-1")).rejects.toThrow(
        "must be approved"
      );
    });

    it("throws NO_ACCOUNT when no connected account", async () => {
      contentRepo.findById.mockResolvedValue(approvedContent);
      accountRepo.findByUserAndPlatformWithTokens.mockResolvedValue(null);
      await expect(service.publishContent("user-1", "c-1")).rejects.toThrow(
        "No connected twitter account"
      );
    });

    it("throws UNSUPPORTED_PLATFORM when no adapter", async () => {
      contentRepo.findById.mockResolvedValue(approvedContent);
      accountRepo.findByUserAndPlatformWithTokens.mockResolvedValue(
        accountWithTokens
      );
      getAdapter.mockReturnValue(null);
      await expect(service.publishContent("user-1", "c-1")).rejects.toThrow(
        "is not supported"
      );
    });
  });

  describe("scheduleContent", () => {
    it("marks owned content as approved", async () => {
      contentRepo.findById.mockResolvedValue({ id: "c-1", userId: "user-1" });
      await service.scheduleContent("user-1", "c-1", new Date());
      expect(contentRepo.updateApprovalStatus).toHaveBeenCalledWith(
        "c-1",
        "approved"
      );
    });

    it("throws NOT_FOUND when content missing", async () => {
      contentRepo.findById.mockResolvedValue(null);
      await expect(
        service.scheduleContent("user-1", "c-1", new Date())
      ).rejects.toThrow("Content not found");
    });

    it("throws UNAUTHORIZED when not owned", async () => {
      contentRepo.findById.mockResolvedValue({ id: "c-1", userId: "other" });
      await expect(
        service.scheduleContent("user-1", "c-1", new Date())
      ).rejects.toThrow("Unauthorized");
    });
  });

  it("exports ServiceError used by guards", () => {
    expect(new ServiceError("x", "Y").code).toBe("Y");
  });
});
