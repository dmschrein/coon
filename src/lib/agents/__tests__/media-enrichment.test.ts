import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichContentWithMedia, isVisualPlatform } from "../media-enrichment";
import type { MediaAsset } from "@/types";

const mockGenerateImage = vi.fn();
const mockGenerateStoryboardFrames = vi.fn();

vi.mock("../image-generation", () => ({
  generateImage: (...args: unknown[]) => mockGenerateImage(...args),
  generateStoryboardFrames: (...args: unknown[]) =>
    mockGenerateStoryboardFrames(...args),
}));

function asset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    type: "image",
    imageUrl: "https://img/a.png",
    revisedPrompt: "revised",
    originalDescription: "orig",
    altText: "alt",
    dimensions: { width: 1024, height: 1024 },
    ...overrides,
  };
}

describe("isVisualPlatform", () => {
  it("returns true for visual platforms", () => {
    expect(isVisualPlatform("instagram")).toBe(true);
    expect(isVisualPlatform("pinterest")).toBe(true);
    expect(isVisualPlatform("youtube")).toBe(true);
    expect(isVisualPlatform("tiktok")).toBe(true);
  });

  it("returns false for non-visual platforms", () => {
    expect(isVisualPlatform("twitter")).toBe(false);
    expect(isVisualPlatform("blog")).toBe(false);
  });
});

describe("enrichContentWithMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty assets when contentData is null", async () => {
    const result = await enrichContentWithMedia(null, "instagram");
    expect(result.assets).toEqual([]);
    expect(typeof result.generatedAt).toBe("string");
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  it("returns empty assets for non-visual platforms", async () => {
    const result = await enrichContentWithMedia({ x: 1 }, "twitter");
    expect(result.assets).toEqual([]);
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  // --- instagram -----------------------------------------------------------

  it("generates an image per instagram carousel slide that has a description", async () => {
    mockGenerateImage.mockResolvedValue(asset());

    const result = await enrichContentWithMedia(
      {
        carouselSlides: [
          { imageDescription: "slide one", altText: "a1", slideNumber: 1 },
          { slideNumber: 2 }, // no description -> filtered out
          { imageDescription: "slide three", slideNumber: 3 },
        ],
      },
      "instagram"
    );

    expect(result.assets).toHaveLength(2);
    expect(mockGenerateImage).toHaveBeenCalledTimes(2);
  });

  it("returns empty assets when instagram has no slides", async () => {
    const result = await enrichContentWithMedia(
      { carouselSlides: [] },
      "instagram"
    );
    expect(result.assets).toEqual([]);
  });

  it("drops rejected instagram slide generations", async () => {
    mockGenerateImage
      .mockResolvedValueOnce(asset())
      .mockRejectedValueOnce(new Error("fail"));

    const result = await enrichContentWithMedia(
      {
        carouselSlides: [
          { imageDescription: "a", slideNumber: 1 },
          { imageDescription: "b", slideNumber: 2 },
        ],
      },
      "instagram"
    );
    expect(result.assets).toHaveLength(1);
  });

  // --- pinterest -----------------------------------------------------------

  it("generates a single pinterest pin from imageDescription", async () => {
    mockGenerateImage.mockResolvedValue(asset());

    const result = await enrichContentWithMedia(
      { imageDescription: "a nice pin" },
      "pinterest"
    );
    expect(result.assets).toHaveLength(1);
    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
  });

  it("returns empty assets when pinterest has no imageDescription", async () => {
    const result = await enrichContentWithMedia({ foo: "bar" }, "pinterest");
    expect(result.assets).toEqual([]);
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  // --- youtube -------------------------------------------------------------

  it("generates a youtube thumbnail and storyboard frames from script segments", async () => {
    mockGenerateImage.mockResolvedValue(asset({ type: "image" }));
    mockGenerateStoryboardFrames.mockResolvedValue([
      asset({ type: "storyboard_frame" }),
    ]);

    const result = await enrichContentWithMedia(
      {
        thumbnailConcept: "bold thumbnail",
        script: {
          bodySegments: [
            { segmentTitle: "Intro", content: "hello" },
            { segmentTitle: "Body", content: "world" },
          ],
        },
      },
      "youtube"
    );

    // 1 thumbnail + 1 storyboard frame
    expect(result.assets).toHaveLength(2);
    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    expect(mockGenerateStoryboardFrames).toHaveBeenCalledTimes(1);
  });

  it("falls back to script.thumbnailConcept and skips storyboard when no segments", async () => {
    mockGenerateImage.mockResolvedValue(asset());

    const result = await enrichContentWithMedia(
      { script: { thumbnailConcept: "from script" } },
      "youtube"
    );

    expect(result.assets).toHaveLength(1);
    expect(mockGenerateStoryboardFrames).not.toHaveBeenCalled();
  });

  it("returns empty assets when youtube has no thumbnail or segments", async () => {
    const result = await enrichContentWithMedia({}, "youtube");
    expect(result.assets).toEqual([]);
  });

  // --- tiktok --------------------------------------------------------------

  it("generates tiktok storyboard frames from a shot list", async () => {
    mockGenerateStoryboardFrames.mockResolvedValue([
      asset({ type: "storyboard_frame" }),
      asset({ type: "storyboard_frame" }),
    ]);

    const result = await enrichContentWithMedia(
      {
        shotList: [
          { description: "shot 1", shotNumber: 1 },
          { description: "shot 2", shotNumber: 2 },
        ],
      },
      "tiktok"
    );
    expect(result.assets).toHaveLength(2);
    expect(mockGenerateStoryboardFrames).toHaveBeenCalledWith(
      expect.any(Array),
      "tiktok"
    );
  });

  it("returns empty assets when tiktok has no shot list", async () => {
    const result = await enrichContentWithMedia({}, "tiktok");
    expect(result.assets).toEqual([]);
    expect(mockGenerateStoryboardFrames).not.toHaveBeenCalled();
  });
});
