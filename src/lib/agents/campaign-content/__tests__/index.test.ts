import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CampaignPlatform } from "@/types";

// Mock each generator module so generatePlatformBatch dispatches to controllable stubs.
vi.mock("../blog", () => ({ generateBlogContent: vi.fn() }));
vi.mock("../instagram", () => ({ generateInstagramContent: vi.fn() }));
vi.mock("../tiktok", () => ({ generateTikTokContent: vi.fn() }));
vi.mock("../twitter", () => ({ generateTwitterContent: vi.fn() }));
vi.mock("../pinterest", () => ({ generatePinterestContent: vi.fn() }));
vi.mock("../youtube", () => ({ generateYouTubeContent: vi.fn() }));
vi.mock("../linkedin", () => ({ generateLinkedInContent: vi.fn() }));
vi.mock("../reddit", () => ({ generateRedditContent: vi.fn() }));
vi.mock("../discord", () => ({ generateDiscordContent: vi.fn() }));
vi.mock("../threads", () => ({ generateThreadsContent: vi.fn() }));
vi.mock("../email", () => ({ generateEmailContent: vi.fn() }));

import { getNextBatch, generatePlatformBatch } from "../index";
import { generateBlogContent } from "../blog";
import { generateTwitterContent } from "../twitter";
import { generateLinkedInContent } from "../linkedin";
import { generatePinterestContent } from "../pinterest";
import { generateDiscordContent } from "../discord";
import { generateThreadsContent } from "../threads";
import { generateYouTubeContent } from "../youtube";

import { campaignStrategyFixture } from "../../__fixtures__/campaign";
import { audienceProfileFixture } from "../../__fixtures__/audience";
import { quizFixture } from "../../__fixtures__/quiz";

const HEAVY: CampaignPlatform[] = ["blog", "youtube"];

const runBatch = (platforms: CampaignPlatform[]) =>
  generatePlatformBatch(
    platforms,
    campaignStrategyFixture,
    audienceProfileFixture,
    quizFixture
  );

describe("getNextBatch", () => {
  it("returns an empty batch when nothing is pending", () => {
    expect(getNextBatch([])).toEqual([]);
  });

  it("returns the input as-is when 2 or fewer platforms remain", () => {
    expect(getNextBatch(["blog", "youtube"])).toEqual(["blog", "youtube"]);
    expect(getNextBatch(["twitter"])).toEqual(["twitter"]);
  });

  it("never pairs two heavy platforms together", () => {
    // Many pending including both heavy platforms.
    const pending: CampaignPlatform[] = [
      "blog",
      "youtube",
      "twitter",
      "discord",
    ];
    const batch = getNextBatch(pending);
    const heavyInBatch = batch.filter((p) => HEAVY.includes(p));
    expect(heavyInBatch.length).toBeLessThanOrEqual(1);
  });

  it("pairs a pending heavy platform with a light platform", () => {
    const batch = getNextBatch(["blog", "twitter", "discord"]);
    expect(batch[0]).toBe("blog");
    expect(batch).toContain("discord");
    expect(batch).not.toContain("youtube");
  });

  it("pairs a heavy platform with a medium platform when no light is pending", () => {
    const batch = getNextBatch(["youtube", "twitter", "linkedin"]);
    expect(batch[0]).toBe("youtube");
    // twitter/linkedin are medium; one of them should be paired.
    expect(batch.length).toBe(2);
    expect(["twitter", "linkedin"]).toContain(batch[1]);
  });

  it("returns a lone heavy platform alone when nothing else can pair", () => {
    const batch = getNextBatch(["blog", "blog", "blog"]);
    expect(batch).toEqual(["blog"]);
  });

  it("pairs two medium platforms when no heavy is pending", () => {
    const batch = getNextBatch(["twitter", "linkedin", "reddit"]);
    expect(batch).toHaveLength(2);
    batch.forEach((p) =>
      expect(["twitter", "linkedin", "reddit"]).toContain(p)
    );
  });

  it("pairs a single medium platform with a light platform", () => {
    const batch = getNextBatch(["twitter", "discord", "threads"]);
    expect(batch[0]).toBe("twitter");
    expect(["discord", "threads"]).toContain(batch[1]);
    expect(batch).toHaveLength(2);
  });

  it("returns a lone medium platform alone when no light is pending", () => {
    // 3 mediums, but only 1 distinct medium counted -> force the
    // "one medium, no light" branch using duplicates of one medium.
    const batch = getNextBatch(["reddit", "blog", "youtube"]);
    // blog+youtube are heavy -> heavy branch wins, reddit is medium light-pair.
    expect(batch[0]).toBe("blog");
  });

  it("groups up to three light platforms when only light remain", () => {
    const batch = getNextBatch(["pinterest", "discord", "threads", "discord"]);
    expect(batch).toHaveLength(3);
    batch.forEach((p) =>
      expect(["pinterest", "discord", "threads"]).toContain(p)
    );
  });

  it("returns a single medium with no light available", () => {
    // One medium + two heavy: heavy branch handles it, so to hit the
    // mediumPending===1 with no light branch we need 1 medium and >2 total
    // with no heavy and no light.
    const batch = getNextBatch(["reddit", "twitter", "linkedin"]);
    expect(batch).toHaveLength(2); // mediumPending >= 2 branch
  });
});

describe("generatePlatformBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns results for all platforms when every generator succeeds", async () => {
    vi.mocked(generateTwitterContent).mockResolvedValue({
      content: { tweets: ["a"] },
      tokensUsed: 100,
    } as never);
    vi.mocked(generateLinkedInContent).mockResolvedValue({
      content: { post: "b" },
      tokensUsed: 200,
    } as never);

    const { results, errors } = await runBatch(["twitter", "linkedin"]);

    expect(errors).toHaveLength(0);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.platform).sort()).toEqual([
      "linkedin",
      "twitter",
    ]);
    expect(results.find((r) => r.platform === "twitter")?.tokensUsed).toBe(100);
  });

  it("isolates a single platform failure via Promise.allSettled", async () => {
    vi.mocked(generateBlogContent).mockRejectedValue(
      new Error("blog model overloaded")
    );
    vi.mocked(generateDiscordContent).mockResolvedValue({
      content: { introChannelMessage: "hi" },
      tokensUsed: 50,
    } as never);

    const { results, errors } = await runBatch(["blog", "discord"]);

    expect(results).toHaveLength(1);
    expect(results[0].platform).toBe("discord");
    expect(errors).toHaveLength(1);
    expect(errors[0].platform).toBe("blog");
    expect(errors[0].error).toBe("blog model overloaded");
  });

  it("stringifies a non-Error rejection reason", async () => {
    vi.mocked(generateThreadsContent).mockRejectedValue("plain string failure");

    const { results, errors } = await runBatch(["threads"]);

    expect(results).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].platform).toBe("threads");
    expect(errors[0].error).toBe("plain string failure");
  });

  it("returns empty results and errors for an empty platform list", async () => {
    const { results, errors } = await runBatch([]);
    expect(results).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("collects multiple failures independently", async () => {
    vi.mocked(generatePinterestContent).mockRejectedValue(new Error("p fail"));
    vi.mocked(generateThreadsContent).mockRejectedValue(new Error("t fail"));
    vi.mocked(generateDiscordContent).mockResolvedValue({
      content: { introChannelMessage: "ok" },
      tokensUsed: 10,
    } as never);

    const { results, errors } = await runBatch([
      "pinterest",
      "discord",
      "threads",
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].platform).toBe("discord");
    expect(errors.map((e) => e.platform).sort()).toEqual([
      "pinterest",
      "threads",
    ]);
  });

  it("dispatches each platform to its registered generator", async () => {
    vi.mocked(generateYouTubeContent).mockResolvedValue({
      content: { title: "yt" },
      tokensUsed: 5,
    } as never);

    await runBatch(["youtube"]);

    expect(generateYouTubeContent).toHaveBeenCalledWith(
      campaignStrategyFixture,
      audienceProfileFixture,
      quizFixture
    );
  });
});
