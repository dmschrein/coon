import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateImage, generateStoryboardFrames } from "../image-generation";

const mockGenerate = vi.fn();

vi.mock("@/lib/openai", () => ({
  getOpenAI: () => ({
    images: { generate: (...args: unknown[]) => mockGenerate(...args) },
  }),
}));

function imageResponse(url = "https://img.example/1.png", revised?: string) {
  return {
    data: [
      {
        url,
        revised_prompt: revised,
      },
    ],
  };
}

function stubImmediateTimeout() {
  const original = globalThis.setTimeout;
  vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
    Promise.resolve().then(() => fn());
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
  return () => vi.stubGlobal("setTimeout", original);
}

describe("generateImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an image asset with platform-specific dimensions", async () => {
    mockGenerate.mockResolvedValue(
      imageResponse("https://img/x.png", "a revised prompt")
    );

    const asset = await generateImage({
      prompt: "A cool pin",
      platform: "pinterest",
    });

    expect(asset.type).toBe("image");
    expect(asset.imageUrl).toBe("https://img/x.png");
    expect(asset.revisedPrompt).toBe("a revised prompt");
    // pinterest -> 1024x1792
    expect(asset.dimensions).toEqual({ width: 1024, height: 1792 });
  });

  it("uses natural style for pinterest and vivid otherwise", async () => {
    mockGenerate.mockResolvedValue(imageResponse());

    await generateImage({ prompt: "p", platform: "pinterest" });
    expect(mockGenerate.mock.calls[0][0]).toMatchObject({ style: "natural" });

    mockGenerate.mockClear();
    await generateImage({ prompt: "i", platform: "instagram" });
    expect(mockGenerate.mock.calls[0][0]).toMatchObject({ style: "vivid" });
  });

  it("defaults to 1024x1024 for platforms without a size mapping", async () => {
    mockGenerate.mockResolvedValue(imageResponse());

    const asset = await generateImage({ prompt: "x", platform: "twitter" });
    expect(asset.dimensions).toEqual({ width: 1024, height: 1024 });
  });

  it("marks the asset as a storyboard_frame when shotNumber is provided", async () => {
    mockGenerate.mockResolvedValue(imageResponse());

    const asset = await generateImage({
      prompt: "frame",
      platform: "youtube",
      shotNumber: 2,
    });
    expect(asset.type).toBe("storyboard_frame");
    expect(asset.shotNumber).toBe(2);
  });

  it("falls back to the original prompt and truncated alt text", async () => {
    const longPrompt = "z".repeat(200);
    mockGenerate.mockResolvedValue({ data: [{ url: undefined }] });

    const asset = await generateImage({
      prompt: longPrompt,
      platform: "instagram",
    });
    expect(asset.imageUrl).toBe("");
    expect(asset.revisedPrompt).toBe(longPrompt);
    expect(asset.altText).toHaveLength(125);
  });

  it("prefers an explicit altText when supplied", async () => {
    mockGenerate.mockResolvedValue(imageResponse());

    const asset = await generateImage({
      prompt: "p",
      platform: "instagram",
      altText: "explicit alt",
    });
    expect(asset.altText).toBe("explicit alt");
  });

  it("throws when the API returns no image data", async () => {
    const restore = stubImmediateTimeout();
    mockGenerate.mockResolvedValue({ data: [] });

    await expect(
      generateImage({ prompt: "p", platform: "instagram" })
    ).rejects.toThrow("Image generation returned no data");
    restore();
  });
});

describe("generateStoryboardFrames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a frame per shot when there are <= 3 shots", async () => {
    mockGenerate.mockResolvedValue(imageResponse());

    const shots = [
      { description: "open", shotNumber: 1 },
      { description: "middle", shotNumber: 2 },
    ];
    const frames = await generateStoryboardFrames(shots, "tiktok");
    expect(frames).toHaveLength(2);
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it("selects only 3 key frames when there are more than 3 shots", async () => {
    mockGenerate.mockResolvedValue(imageResponse());

    const shots = Array.from({ length: 7 }, (_, i) => ({
      description: `shot ${i}`,
      shotNumber: i + 1,
    }));
    const frames = await generateStoryboardFrames(shots, "youtube");
    expect(frames).toHaveLength(3);
    expect(mockGenerate).toHaveBeenCalledTimes(3);
  });

  it("drops frames whose generation rejects (Promise.allSettled)", async () => {
    const restore = stubImmediateTimeout();
    mockGenerate
      .mockResolvedValueOnce(imageResponse())
      .mockRejectedValue(new Error("boom"));

    const shots = [
      { description: "a", shotNumber: 1 },
      { description: "b", shotNumber: 2 },
    ];
    const frames = await generateStoryboardFrames(shots, "tiktok");
    expect(frames).toHaveLength(1);
    restore();
  });
});
