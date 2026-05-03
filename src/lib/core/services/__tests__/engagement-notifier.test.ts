import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyTrendingPost, notifyNewAdvocates } from "../engagement-notifier";
import type {
  CampaignContentRepository,
  EngagementRepository,
  NotificationRepository,
  PlatformMemberRow,
  PostEngagementRow,
} from "../../repositories/interfaces";
import type { CampaignContentEntity } from "../../domain/content";

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

function createMockNotificationRepo(): MockRepo<NotificationRepository> {
  return {
    createNotification: vi.fn(),
    listNotifications: vi.fn(),
    findExistingByLink: vi.fn(),
    markAllRead: vi.fn(),
    countUnread: vi.fn(),
  };
}

function createMockEngagementRepo(): MockRepo<EngagementRepository> {
  return {
    upsertEngagement: vi.fn(),
    getEngagementByContentId: vi.fn(),
    getAverageEngagementRate: vi.fn(),
  };
}

function createMockContentRepo(): Partial<MockRepo<CampaignContentRepository>> {
  return {
    findByCampaignId: vi.fn(),
    findById: vi.fn(),
  };
}

function makeContent(overrides: Partial<CampaignContentEntity> = {}) {
  return {
    id: "content-1",
    campaignId: "camp-1",
    userId: "user_123",
    title: "How we shipped in 7 days",
    ...overrides,
  } as unknown as CampaignContentEntity;
}

function makeStored(rate: string | null): PostEngagementRow {
  return {
    id: "eng-1",
    campaignContentId: "content-1",
    platform: "instagram",
    platformPostId: "post_abc",
    likes: 200,
    comments: 30,
    shares: 5,
    reach: 1000,
    impressions: 1500,
    engagementRate: rate,
    recordedAt: new Date(),
    createdAt: new Date(),
  };
}

describe("notifyTrendingPost", () => {
  let notificationRepo: MockRepo<NotificationRepository>;
  let engagementRepo: MockRepo<EngagementRepository>;
  let contentRepo: Partial<MockRepo<CampaignContentRepository>>;

  beforeEach(() => {
    notificationRepo = createMockNotificationRepo();
    engagementRepo = createMockEngagementRepo();
    contentRepo = createMockContentRepo();
  });

  function deps() {
    return {
      notificationRepo: notificationRepo as unknown as NotificationRepository,
      engagementRepo: engagementRepo as unknown as EngagementRepository,
      contentRepo: contentRepo as unknown as CampaignContentRepository,
    };
  }

  it("creates a post_trending notification when rate >= 2x average", async () => {
    contentRepo.findByCampaignId!.mockResolvedValue([
      { id: "content-1" },
      { id: "content-2" },
      { id: "content-3" },
    ]);
    engagementRepo.getAverageEngagementRate.mockResolvedValue(5);
    notificationRepo.findExistingByLink.mockResolvedValue(null);

    await notifyTrendingPost(deps(), makeContent(), makeStored("12.5"));

    expect(engagementRepo.getAverageEngagementRate).toHaveBeenCalledWith([
      "content-2",
      "content-3",
    ]);
    expect(notificationRepo.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        type: "post_trending",
        title: "Your post is trending",
        link: "/dashboard/campaigns/camp-1/content/content-1",
      })
    );
  });

  it("does not notify when rate is below 2x average", async () => {
    contentRepo.findByCampaignId!.mockResolvedValue([
      { id: "content-1" },
      { id: "content-2" },
    ]);
    engagementRepo.getAverageEngagementRate.mockResolvedValue(5);

    await notifyTrendingPost(deps(), makeContent(), makeStored("8.0"));

    expect(notificationRepo.createNotification).not.toHaveBeenCalled();
  });

  it("is idempotent — does not notify when an existing trending notification already exists", async () => {
    contentRepo.findByCampaignId!.mockResolvedValue([
      { id: "content-1" },
      { id: "content-2" },
    ]);
    engagementRepo.getAverageEngagementRate.mockResolvedValue(5);
    notificationRepo.findExistingByLink.mockResolvedValue({
      id: "existing-n",
      userId: "user_123",
      type: "post_trending",
      title: "Your post is trending",
      body: "...",
      link: "/dashboard/campaigns/camp-1/content/content-1",
      read: false,
      createdAt: new Date(),
    });

    await notifyTrendingPost(deps(), makeContent(), makeStored("12.5"));

    expect(notificationRepo.createNotification).not.toHaveBeenCalled();
  });

  it("skips when engagement rate is null", async () => {
    await notifyTrendingPost(deps(), makeContent(), makeStored(null));
    expect(engagementRepo.getAverageEngagementRate).not.toHaveBeenCalled();
    expect(notificationRepo.createNotification).not.toHaveBeenCalled();
  });

  it("skips when no siblings have engagement (avg is null)", async () => {
    contentRepo.findByCampaignId!.mockResolvedValue([{ id: "content-1" }]);
    engagementRepo.getAverageEngagementRate.mockResolvedValue(null);

    await notifyTrendingPost(deps(), makeContent(), makeStored("12.5"));

    expect(notificationRepo.createNotification).not.toHaveBeenCalled();
  });
});

describe("notifyNewAdvocates", () => {
  let notificationRepo: MockRepo<NotificationRepository>;

  beforeEach(() => {
    notificationRepo = createMockNotificationRepo();
  });

  function makeMember(count: number): PlatformMemberRow {
    return {
      id: "mem-" + count,
      userId: "user_123",
      platform: "instagram",
      platformUserId: "ig_" + count,
      username: "alice",
      displayName: "Alice",
      firstSeenAt: new Date(),
      engagementCount: count,
      lastSeenAt: new Date(),
      status: "prospect",
      tags: [],
      notes: null,
    };
  }

  it("creates a new_advocate notification when count is exactly 5", async () => {
    await notifyNewAdvocates(
      notificationRepo as unknown as NotificationRepository,
      "user_123",
      [makeMember(5)]
    );

    expect(notificationRepo.createNotification).toHaveBeenCalledTimes(1);
    expect(notificationRepo.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        type: "new_advocate",
        link: "/dashboard/community/mem-5",
      })
    );
  });

  it("does not notify when count is below 5", async () => {
    await notifyNewAdvocates(
      notificationRepo as unknown as NotificationRepository,
      "user_123",
      [makeMember(4)]
    );
    expect(notificationRepo.createNotification).not.toHaveBeenCalled();
  });

  it("does not notify when count is above 5 (already past threshold)", async () => {
    await notifyNewAdvocates(
      notificationRepo as unknown as NotificationRepository,
      "user_123",
      [makeMember(7)]
    );
    expect(notificationRepo.createNotification).not.toHaveBeenCalled();
  });

  it("notifies for each member that just crossed", async () => {
    await notifyNewAdvocates(
      notificationRepo as unknown as NotificationRepository,
      "user_123",
      [makeMember(5), makeMember(3), makeMember(5)]
    );
    expect(notificationRepo.createNotification).toHaveBeenCalledTimes(2);
  });
});
