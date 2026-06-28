import { describe, it, expect, vi, beforeEach } from "vitest";
import { InboxService, type CreateInboxItemInput } from "../inbox-service";
import type {
  InboxRepository,
  BlockedSenderRepository,
  InboxItemRow,
  BlockedSenderRow,
} from "../../repositories/interfaces";

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

function createInboxRepo(): MockRepo<InboxRepository> {
  return {
    createItem: vi.fn(),
    listItems: vi.fn(),
    getItem: vi.fn(),
    updateStatus: vi.fn(),
    setFlagged: vi.fn(),
    markAllFromAuthorRead: vi.fn(),
    countUnread: vi.fn(),
  };
}

function createBlockedSenderRepo(): MockRepo<BlockedSenderRepository> {
  return {
    block: vi.fn(),
    listForUser: vi.fn(),
  };
}

const baseInput: CreateInboxItemInput = {
  userId: "user-1",
  platform: "twitter",
  authorHandle: "@spammer",
  messageText: "buy now",
  messageType: "comment",
  platformMessageId: "msg-1",
  receivedAt: new Date("2026-05-01"),
};

const makeItem = (overrides: Partial<InboxItemRow> = {}): InboxItemRow => ({
  id: "item-1",
  userId: "user-1",
  campaignId: null,
  contentId: null,
  platform: "twitter",
  authorHandle: "@spammer",
  authorDisplayName: null,
  messageText: "buy now",
  messageType: "comment",
  status: "unread",
  platformMessageId: "msg-1",
  receivedAt: new Date("2026-05-01"),
  flagged: false,
  flagReason: null,
  flagCategory: null,
  createdAt: new Date("2026-05-01"),
  ...overrides,
});

describe("InboxService.createInboxItemWithModeration", () => {
  let inboxRepo: MockRepo<InboxRepository>;
  let blockedSenderRepo: MockRepo<BlockedSenderRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    inboxRepo = createInboxRepo();
    blockedSenderRepo = createBlockedSenderRepo();
    inboxRepo.createItem.mockImplementation(async (p) =>
      makeItem({
        flagged: p.flagged,
        flagReason: p.flagReason ?? null,
        flagCategory: p.flagCategory ?? null,
      })
    );
  });

  it("creates an unflagged item when no moderation agent is configured", async () => {
    const service = new InboxService(
      inboxRepo as unknown as InboxRepository,
      blockedSenderRepo as unknown as BlockedSenderRepository,
      null
    );

    const result = await service.createInboxItemWithModeration(baseInput);

    expect(result.flagged).toBe(false);
    expect(inboxRepo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        flagged: false,
        flagReason: null,
        flagCategory: null,
        platformMessageId: "msg-1",
      })
    );
  });

  it("applies moderation result (flagged) from the agent", async () => {
    const moderationAgent = {
      checkModeration: vi.fn().mockResolvedValue({
        result: { flagged: true, reason: "spam", category: "spam" },
        modelUsed: "claude",
        tokensUsed: 10,
      }),
    };
    const service = new InboxService(
      inboxRepo as unknown as InboxRepository,
      blockedSenderRepo as unknown as BlockedSenderRepository,
      moderationAgent
    );

    const result = await service.createInboxItemWithModeration(baseInput);

    expect(moderationAgent.checkModeration).toHaveBeenCalledWith({
      messageText: "buy now",
      authorHandle: "@spammer",
      platform: "twitter",
    });
    expect(result.flagged).toBe(true);
    expect(inboxRepo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        flagged: true,
        flagReason: "spam",
        flagCategory: "spam",
      })
    );
  });

  it("defaults reason/category to null when agent omits them", async () => {
    const moderationAgent = {
      checkModeration: vi.fn().mockResolvedValue({
        result: { flagged: true },
        modelUsed: "claude",
        tokensUsed: 5,
      }),
    };
    const service = new InboxService(
      inboxRepo as unknown as InboxRepository,
      blockedSenderRepo as unknown as BlockedSenderRepository,
      moderationAgent
    );

    await service.createInboxItemWithModeration(baseInput);

    expect(inboxRepo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        flagged: true,
        flagReason: null,
        flagCategory: null,
      })
    );
  });

  it("still creates the item unflagged when the agent throws", async () => {
    const moderationAgent = {
      checkModeration: vi.fn().mockRejectedValue(new Error("claude down")),
    };
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = new InboxService(
      inboxRepo as unknown as InboxRepository,
      blockedSenderRepo as unknown as BlockedSenderRepository,
      moderationAgent
    );

    const result = await service.createInboxItemWithModeration(baseInput);

    expect(result.flagged).toBe(false);
    expect(inboxRepo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({ flagged: false })
    );
    errSpy.mockRestore();
  });
});

describe("InboxService.moderateInboxItem", () => {
  let inboxRepo: MockRepo<InboxRepository>;
  let blockedSenderRepo: MockRepo<BlockedSenderRepository>;
  let service: InboxService;

  beforeEach(() => {
    vi.clearAllMocks();
    inboxRepo = createInboxRepo();
    blockedSenderRepo = createBlockedSenderRepo();
    service = new InboxService(
      inboxRepo as unknown as InboxRepository,
      blockedSenderRepo as unknown as BlockedSenderRepository
    );
  });

  it("throws when the item does not exist", async () => {
    inboxRepo.getItem.mockResolvedValue(null);
    await expect(
      service.moderateInboxItem("item-1", "user-1", "approve")
    ).rejects.toThrow("Inbox item not found");
  });

  it("throws when the item belongs to another user", async () => {
    inboxRepo.getItem.mockResolvedValue(makeItem({ userId: "someone-else" }));
    await expect(
      service.moderateInboxItem("item-1", "user-1", "approve")
    ).rejects.toThrow("Inbox item not found");
  });

  it("approve clears the flag and affects one item", async () => {
    inboxRepo.getItem.mockResolvedValue(makeItem());
    inboxRepo.setFlagged.mockResolvedValue(makeItem({ flagged: false }));

    const result = await service.moderateInboxItem(
      "item-1",
      "user-1",
      "approve"
    );

    expect(inboxRepo.setFlagged).toHaveBeenCalledWith("item-1", false);
    expect(result).toEqual({
      itemId: "item-1",
      action: "approve",
      affectedItems: 1,
      blockedSender: null,
    });
  });

  it("hide marks the item read and clears the flag", async () => {
    inboxRepo.getItem.mockResolvedValue(makeItem());
    inboxRepo.updateStatus.mockResolvedValue(makeItem({ status: "read" }));
    inboxRepo.setFlagged.mockResolvedValue(makeItem({ flagged: false }));

    const result = await service.moderateInboxItem("item-1", "user-1", "hide");

    expect(inboxRepo.updateStatus).toHaveBeenCalledWith("item-1", "read");
    expect(inboxRepo.setFlagged).toHaveBeenCalledWith("item-1", false);
    expect(result.action).toBe("hide");
    expect(result.affectedItems).toBe(1);
    expect(result.blockedSender).toBeNull();
  });

  it("block_sender blocks the author and marks all their items read", async () => {
    const blocked: BlockedSenderRow = {
      id: "block-1",
      userId: "user-1",
      platform: "twitter",
      handle: "@spammer",
      blockedAt: new Date("2026-05-02"),
    };
    inboxRepo.getItem.mockResolvedValue(makeItem());
    blockedSenderRepo.block.mockResolvedValue(blocked);
    inboxRepo.markAllFromAuthorRead.mockResolvedValue(4);

    const result = await service.moderateInboxItem(
      "item-1",
      "user-1",
      "block_sender"
    );

    expect(blockedSenderRepo.block).toHaveBeenCalledWith({
      userId: "user-1",
      platform: "twitter",
      handle: "@spammer",
    });
    expect(inboxRepo.markAllFromAuthorRead).toHaveBeenCalledWith(
      "user-1",
      "twitter",
      "@spammer"
    );
    expect(result).toEqual({
      itemId: "item-1",
      action: "block_sender",
      affectedItems: 4,
      blockedSender: blocked,
    });
  });
});
