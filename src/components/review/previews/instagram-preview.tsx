"use client";

import Image from "next/image";
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import type { MediaAsset } from "@/types";

interface InstagramPreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
  media: MediaAsset[];
}

export function InstagramPreview({
  title,
  body,
  contentData,
  media,
}: InstagramPreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const hashtags = (data?.hashtags as string[]) ?? [];
  const caption = body ?? (data?.caption as string) ?? title ?? "";

  return (
    <div className="mx-auto w-full max-w-[350px] overflow-hidden rounded-lg border bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
        <span className="text-xs font-semibold text-black">your_brand</span>
      </div>

      {/* Image area */}
      <div className="relative aspect-square bg-gray-100">
        {media.length > 0 ? (
          <Image
            src={media[0].imageUrl}
            alt={media[0].altText}
            fill
            className="object-cover"
            sizes="350px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Image placeholder
          </div>
        )}
        {media.length > 1 && (
          <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            1/{media.length}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-4">
          <Heart className="h-5 w-5 text-black" />
          <MessageCircle className="h-5 w-5 text-black" />
          <Send className="h-5 w-5 text-black" />
        </div>
        <Bookmark className="h-5 w-5 text-black" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="line-clamp-3 text-xs text-black">
          <span className="font-semibold">your_brand </span>
          {caption}
        </p>
        {hashtags.length > 0 && (
          <p className="mt-1 text-xs text-blue-600">
            {hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}
