"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import type { MediaAsset, CampaignPlatform } from "@/types";

interface MediaGalleryProps {
  assets: MediaAsset[];
  platform: CampaignPlatform;
}

export function MediaGallery({ assets, platform }: MediaGalleryProps) {
  if (assets.length === 0) return null;

  const images = assets.filter((a) => a.type === "image");
  const frames = assets.filter((a) => a.type === "storyboard_frame");

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">
        {platform === "instagram"
          ? "Carousel Images"
          : platform === "pinterest"
            ? "Pin Image"
            : "Generated Visuals"}
      </h4>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((asset, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="relative aspect-square">
                <Image
                  src={asset.imageUrl}
                  alt={asset.altText}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              {asset.slideNumber != null && (
                <div className="bg-muted px-2 py-1 text-xs">
                  Slide {asset.slideNumber}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {frames.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Storyboard Frames</p>
          <div className="flex gap-2 overflow-x-auto">
            {frames.map((frame, i) => (
              <Card
                key={i}
                className="shrink-0 overflow-hidden"
                style={{ width: 120 }}
              >
                <div className="relative" style={{ height: 160 }}>
                  <Image
                    src={frame.imageUrl}
                    alt={frame.altText}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </div>
                <div className="bg-muted px-2 py-1 text-xs">
                  Shot {frame.shotNumber}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
