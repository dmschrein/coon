"use client";

import { ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";

interface LinkedInPreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
}

export function LinkedInPreview({
  title,
  body,
  contentData,
}: LinkedInPreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const postBody = body ?? (data?.post as string) ?? title ?? "";
  const hashtags = (data?.hashtags as string[]) ?? [];

  return (
    <div className="mx-auto w-full max-w-[450px] rounded-lg border bg-white">
      {/* Header */}
      <div className="flex gap-3 p-4 pb-2">
        <div className="h-12 w-12 shrink-0 rounded-full bg-blue-100" />
        <div>
          <p className="text-sm font-semibold text-black">Your Brand</p>
          <p className="text-xs text-gray-500">Founder & CEO • 1st</p>
          <p className="text-xs text-gray-400">2h •</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        <p className="text-sm whitespace-pre-wrap text-black">{postBody}</p>
        {hashtags.length > 0 && (
          <p className="mt-2 text-sm text-blue-600">
            {hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
          </p>
        )}
      </div>

      {/* Reactions bar */}
      <div className="border-t px-4 py-2 text-xs text-gray-500">
        32 reactions • 8 comments
      </div>

      {/* Actions */}
      <div className="flex justify-between border-t px-2 py-1">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageSquare, label: "Comment" },
          { icon: Repeat2, label: "Repost" },
          { icon: Send, label: "Send" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-1 rounded px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
