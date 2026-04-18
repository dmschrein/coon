"use client";

import Image from "next/image";
import { Heart, MessageCircle, Share2, Music } from "lucide-react";
import type { MediaAsset } from "@/types";

interface TikTokPreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
  media: MediaAsset[];
}

export function TikTokPreview({
  title,
  body,
  contentData,
  media,
}: TikTokPreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const caption = body ?? (data?.caption as string) ?? title ?? "";
  const hashtags = (data?.hashtags as string[]) ?? [];

  return (
    <div className="relative mx-auto h-[500px] w-[280px] overflow-hidden rounded-2xl bg-black">
      {/* Background frame */}
      {media.length > 0 ? (
        <Image
          src={media[0].imageUrl}
          alt={media[0].altText}
          fill
          className="object-cover opacity-70"
          sizes="280px"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black" />
      )}

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center">
          <Heart className="h-7 w-7 text-white" />
          <span className="mt-1 text-xs text-white">4.2K</span>
        </div>
        <div className="flex flex-col items-center">
          <MessageCircle className="h-7 w-7 text-white" />
          <span className="mt-1 text-xs text-white">89</span>
        </div>
        <div className="flex flex-col items-center">
          <Share2 className="h-7 w-7 text-white" />
          <span className="mt-1 text-xs text-white">215</span>
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
        <p className="text-xs font-semibold text-white">@yourbrand</p>
        <p className="mt-1 line-clamp-2 text-xs text-white">{caption}</p>
        {hashtags.length > 0 && (
          <p className="mt-1 text-xs text-white/80">
            {hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1">
          <Music className="h-3 w-3 text-white" />
          <span className="text-xs text-white/70">Original sound</span>
        </div>
      </div>
    </div>
  );
}
