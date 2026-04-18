/**
 * Image Generation Agent - Generates images using OpenAI DALL-E 3.
 */

import { getOpenAI } from "@/lib/openai";
import { withRetry } from "./utils";
import type { CampaignPlatform, MediaAsset } from "@/types";

type ImageSize = "1024x1024" | "1024x1792" | "1792x1024";

const PLATFORM_SIZE_MAP: Partial<Record<CampaignPlatform, ImageSize>> = {
  instagram: "1024x1024",
  pinterest: "1024x1792",
  youtube: "1792x1024",
  tiktok: "1024x1792",
};

function getDimensions(size: ImageSize): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  return { width: w, height: h };
}

export async function generateImage(params: {
  prompt: string;
  platform: CampaignPlatform;
  altText?: string;
  slideNumber?: number;
  shotNumber?: number;
}): Promise<MediaAsset> {
  const size = PLATFORM_SIZE_MAP[params.platform] ?? "1024x1024";
  const style = params.platform === "pinterest" ? "natural" : "vivid";

  const response = await withRetry(async () => {
    return getOpenAI().images.generate({
      model: "dall-e-3",
      prompt: params.prompt,
      n: 1,
      size,
      style,
      response_format: "url",
    });
  });

  const imageData = response.data[0];

  return {
    type: params.shotNumber != null ? "storyboard_frame" : "image",
    imageUrl: imageData.url ?? "",
    revisedPrompt: imageData.revised_prompt ?? params.prompt,
    originalDescription: params.prompt,
    altText: params.altText ?? params.prompt.slice(0, 125),
    dimensions: getDimensions(size),
    slideNumber: params.slideNumber,
    shotNumber: params.shotNumber,
  };
}

export async function generateStoryboardFrames(
  shots: { description: string; shotNumber: number }[],
  platform: CampaignPlatform
): Promise<MediaAsset[]> {
  // Pick up to 3 key frames evenly distributed
  const keyIndices = selectKeyFrames(shots.length, 3);
  const keyShots = keyIndices.map((i) => shots[i]);

  const results = await Promise.allSettled(
    keyShots.map((shot) =>
      generateImage({
        prompt: `Storyboard frame: ${shot.description}. Clean, professional visual style suitable for ${platform} content.`,
        platform,
        shotNumber: shot.shotNumber,
      })
    )
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<MediaAsset> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}

function selectKeyFrames(total: number, max: number): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i);
  const step = (total - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}
