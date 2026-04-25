import { describe, it, expect } from "vitest";
import { MockAdapter } from "../mock";

describe("MockAdapter.fetchEngagement", () => {
  it("returns deterministic results for the same postId", async () => {
    const adapter = new MockAdapter("instagram");
    const r1 = await adapter.fetchEngagement("post_123", "token");
    const r2 = await adapter.fetchEngagement("post_123", "token");

    expect(r1!.likes).toBe(r2!.likes);
    expect(r1!.comments).toBe(r2!.comments);
    expect(r1!.shares).toBe(r2!.shares);
    expect(r1!.reach).toBe(r2!.reach);
    expect(r1!.impressions).toBe(r2!.impressions);
    expect(r1!.engagementRate).toBe(r2!.engagementRate);
  });

  it("returns different results for different postIds", async () => {
    const adapter = new MockAdapter("instagram");
    const r1 = await adapter.fetchEngagement("post_aaa", "token");
    const r2 = await adapter.fetchEngagement("post_bbb", "token");

    const allSame =
      r1!.likes === r2!.likes &&
      r1!.comments === r2!.comments &&
      r1!.shares === r2!.shares;
    expect(allSame).toBe(false);
  });

  it("returns platform-appropriate engagement rate for Instagram (~3.5%)", async () => {
    const adapter = new MockAdapter("instagram");
    const result = await adapter.fetchEngagement("test_post_42", "token");
    const rate = parseFloat(result!.engagementRate!);

    expect(rate).toBeGreaterThan(2.0);
    expect(rate).toBeLessThan(5.0);
  });

  it("returns platform-appropriate engagement rate for Twitter (~0.5%)", async () => {
    const adapter = new MockAdapter("twitter");
    const result = await adapter.fetchEngagement("test_post_42", "token");
    const rate = parseFloat(result!.engagementRate!);

    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(1.5);
  });

  it("returns platform-appropriate engagement rate for TikTok (~5%)", async () => {
    const adapter = new MockAdapter("tiktok");
    const result = await adapter.fetchEngagement("test_post_42", "token");
    const rate = parseFloat(result!.engagementRate!);

    expect(rate).toBeGreaterThan(3.0);
    expect(rate).toBeLessThan(7.0);
  });

  it("returns valid PlatformEngagement shape", async () => {
    const adapter = new MockAdapter("linkedin");
    const result = await adapter.fetchEngagement("any_post", "token");

    expect(result).toMatchObject({
      likes: expect.any(Number),
      comments: expect.any(Number),
      shares: expect.any(Number),
      reach: expect.any(Number),
      impressions: expect.any(Number),
      engagementRate: expect.any(String),
      recordedAt: expect.any(Date),
    });
  });
});
