/**
 * Media Enrichment Agent - Extracts image descriptions from content
 * and generates actual images via DALL-E 3.
 */

import { generateImage, generateStoryboardFrames } from "./image-generation";
import type { CampaignPlatform, MediaAsset, MediaSuggestions } from "@/types";

const VISUAL_PLATFORMS = new Set<CampaignPlatform>([
  "instagram",
  "pinterest",
  "youtube",
  "tiktok",
]);

export function isVisualPlatform(platform: CampaignPlatform): boolean {
  return VISUAL_PLATFORMS.has(platform);
}

export async function enrichContentWithMedia(
  contentData: unknown,
  platform: CampaignPlatform
): Promise<MediaSuggestions> {
  if (!contentData || !isVisualPlatform(platform)) {
    return { assets: [], generatedAt: new Date().toISOString() };
  }

  const data = contentData as Record<string, unknown>;
  let assets: MediaAsset[] = [];

  switch (platform) {
    case "instagram":
      assets = await generateInstagramMedia(data);
      break;
    case "pinterest":
      assets = await generatePinterestMedia(data);
      break;
    case "youtube":
      assets = await generateYouTubeMedia(data);
      break;
    case "tiktok":
      assets = await generateTikTokMedia(data);
      break;
  }

  return { assets, generatedAt: new Date().toISOString() };
}

async function generateInstagramMedia(
  data: Record<string, unknown>
): Promise<MediaAsset[]> {
  const slides = data.carouselSlides as
    | { imageDescription?: string; altText?: string; slideNumber: number }[]
    | undefined;

  if (!slides?.length) return [];

  const results = await Promise.allSettled(
    slides
      .filter((s) => s.imageDescription)
      .map((slide) =>
        generateImage({
          prompt: `Instagram carousel slide: ${slide.imageDescription}. Modern, eye-catching social media style.`,
          platform: "instagram",
          altText: slide.altText,
          slideNumber: slide.slideNumber,
        })
      )
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<MediaAsset> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}

async function generatePinterestMedia(
  data: Record<string, unknown>
): Promise<MediaAsset[]> {
  const desc = data.imageDescription as string | undefined;
  if (!desc) return [];

  const asset = await generateImage({
    prompt: `Pinterest pin: ${desc}. Vertical 2:3 ratio, clean and inspiring visual style.`,
    platform: "pinterest",
    altText: (data.altText as string) ?? desc.slice(0, 125),
  });

  return [asset];
}

async function generateYouTubeMedia(
  data: Record<string, unknown>
): Promise<MediaAsset[]> {
  const assets: MediaAsset[] = [];

  // Thumbnail
  const script = data.script as Record<string, unknown> | undefined;
  const thumbnailConcept =
    (data.thumbnailConcept as string) ??
    (script?.thumbnailConcept as string | undefined);

  if (thumbnailConcept) {
    const thumbnail = await generateImage({
      prompt: `YouTube thumbnail: ${thumbnailConcept}. Bold, high-contrast, attention-grabbing.`,
      platform: "youtube",
      altText: `Thumbnail: ${thumbnailConcept.slice(0, 100)}`,
    });
    assets.push(thumbnail);
  }

  // Storyboard frames from script segments
  const segments = script?.bodySegments as
    | { segmentTitle: string; content: string }[]
    | undefined;

  if (segments?.length) {
    const shots = segments.map((s, i) => ({
      description: `${s.segmentTitle}: ${s.content.slice(0, 100)}`,
      shotNumber: i + 1,
    }));
    const frames = await generateStoryboardFrames(shots, "youtube");
    assets.push(...frames);
  }

  return assets;
}

async function generateTikTokMedia(
  data: Record<string, unknown>
): Promise<MediaAsset[]> {
  const shotList = data.shotList as
    | { description: string; shotNumber: number }[]
    | undefined;

  if (!shotList?.length) return [];

  return generateStoryboardFrames(shotList, "tiktok");
}
