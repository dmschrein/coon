"use client";

import Image from "next/image";
import type { MediaAsset } from "@/types";

interface PinterestPreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
  media: MediaAsset[];
}

export function PinterestPreview({
  title,
  body,
  contentData,
  media,
}: PinterestPreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const pinTitle = title ?? (data?.title as string) ?? "";
  const description = body ?? (data?.description as string) ?? "";
  const image = media[0];

  return (
    <div className="mx-auto w-[240px] overflow-hidden rounded-2xl border bg-white">
      {/* Pin image (2:3 ratio) */}
      <div className="relative" style={{ aspectRatio: "2/3" }}>
        {image ? (
          <Image
            src={image.imageUrl}
            alt={image.altText}
            fill
            className="object-cover"
            sizes="240px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100 text-xs text-gray-400">
            Pin Image
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {pinTitle && (
          <h3 className="line-clamp-2 text-sm font-semibold text-black">
            {pinTitle}
          </h3>
        )}
        {description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-600">
            {description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-600">Your Brand</span>
        </div>
      </div>
    </div>
  );
}
