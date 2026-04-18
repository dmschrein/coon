"use client";

import Image from "next/image";
import type { MediaAsset } from "@/types";

interface YouTubePreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
  media: MediaAsset[];
}

export function YouTubePreview({
  title,
  body,
  contentData,
  media,
}: YouTubePreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const videoTitle = title ?? (data?.title as string) ?? "Untitled Video";
  const description = body ?? (data?.description as string) ?? "";
  const thumbnail = media.find((m) => m.type === "image");

  return (
    <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-lg border bg-white">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {thumbnail ? (
          <Image
            src={thumbnail.imageUrl}
            alt={thumbnail.altText}
            fill
            className="object-cover"
            sizes="400px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Thumbnail
          </div>
        )}
        <div className="absolute right-2 bottom-2 rounded bg-black/80 px-1 py-0.5 text-xs text-white">
          10:24
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3 p-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-gray-300" />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold text-black">
            {videoTitle}
          </h3>
          <p className="mt-0.5 text-xs text-gray-600">
            Your Brand • 1.2K views • 2 hours ago
          </p>
          {description && (
            <p className="mt-1 line-clamp-1 text-xs text-gray-500">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
