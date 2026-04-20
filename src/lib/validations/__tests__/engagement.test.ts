import { describe, it, expect } from "vitest";
import {
  insertPostEngagementSchema,
  updatePostEngagementSchema,
  insertPlatformMemberSchema,
} from "../engagement";

describe("insertPostEngagementSchema", () => {
  const valid = {
    campaignContentId: "550e8400-e29b-41d4-a716-446655440000",
    platform: "instagram",
    platformPostId: "post_123",
    likes: 10,
    comments: 5,
    shares: 2,
    reach: 100,
    impressions: 200,
    engagementRate: "8.5",
    recordedAt: new Date().toISOString(),
  };

  it("accepts valid engagement data", () => {
    const result = insertPostEngagementSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("applies defaults for metric fields", () => {
    const minimal = {
      campaignContentId: "550e8400-e29b-41d4-a716-446655440000",
      platform: "twitter",
      platformPostId: "tweet_456",
      recordedAt: new Date().toISOString(),
    };
    const result = insertPostEngagementSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.likes).toBe(0);
      expect(result.data.comments).toBe(0);
      expect(result.data.shares).toBe(0);
    }
  });

  it("rejects invalid campaignContentId", () => {
    const result = insertPostEngagementSchema.safeParse({
      ...valid,
      campaignContentId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing platform", () => {
    const { platform, ...rest } = valid;
    const result = insertPostEngagementSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects negative metric values", () => {
    const result = insertPostEngagementSchema.safeParse({
      ...valid,
      likes: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing recordedAt", () => {
    const { recordedAt, ...rest } = valid;
    const result = insertPostEngagementSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("updatePostEngagementSchema", () => {
  it("accepts partial updates", () => {
    const result = updatePostEngagementSchema.safeParse({ likes: 25 });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updatePostEngagementSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects negative values", () => {
    const result = updatePostEngagementSchema.safeParse({ shares: -5 });
    expect(result.success).toBe(false);
  });
});

describe("insertPlatformMemberSchema", () => {
  const valid = {
    userId: "user_abc123",
    platform: "reddit",
    platformUserId: "reddit_user_789",
    username: "cooluser42",
    displayName: "Cool User",
  };

  it("accepts valid member data", () => {
    const result = insertPlatformMemberSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts without optional displayName", () => {
    const { displayName, ...rest } = valid;
    const result = insertPlatformMemberSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = insertPlatformMemberSchema.safeParse({
      ...valid,
      username: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing userId", () => {
    const { userId, ...rest } = valid;
    const result = insertPlatformMemberSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing platform", () => {
    const { platform, ...rest } = valid;
    const result = insertPlatformMemberSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
