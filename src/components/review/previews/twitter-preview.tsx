"use client";

import { Heart, MessageCircle, Repeat2, BarChart3 } from "lucide-react";

interface TwitterPreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
}

export function TwitterPreview({
  title,
  body,
  contentData,
}: TwitterPreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const tweet = body ?? (data?.tweet as string) ?? title ?? "";
  const hashtags = (data?.hashtags as string[]) ?? [];

  return (
    <div className="mx-auto w-full max-w-[400px] rounded-xl border bg-white p-4">
      {/* Header */}
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gray-300" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-black">Your Brand</span>
            <span className="text-sm text-gray-500">@yourbrand</span>
          </div>

          {/* Tweet body */}
          <p className="mt-1 text-sm whitespace-pre-wrap text-black">{tweet}</p>
          {hashtags.length > 0 && (
            <p className="mt-1 text-sm text-blue-500">
              {hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
            </p>
          )}

          {/* Metrics bar */}
          <div className="mt-3 flex justify-between text-gray-500">
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">24</span>
            </div>
            <div className="flex items-center gap-1">
              <Repeat2 className="h-4 w-4" />
              <span className="text-xs">12</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span className="text-xs">148</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">2.4K</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
