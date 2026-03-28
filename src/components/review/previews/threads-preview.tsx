"use client";

import { Heart, MessageCircle, Repeat2, Send } from "lucide-react";

interface ThreadsPreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
}

export function ThreadsPreview({
  title,
  body,
  contentData,
}: ThreadsPreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const postBody = body ?? (data?.post as string) ?? title ?? "";

  return (
    <div className="mx-auto w-full max-w-[400px] border-b bg-white p-4">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="h-9 w-9 rounded-full bg-gray-300" />
          <div className="mt-1 w-0.5 flex-1 bg-gray-200" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-black">yourbrand</span>
            <span className="text-xs text-gray-400">2h</span>
          </div>

          <p className="mt-1 text-sm whitespace-pre-wrap text-black">
            {postBody}
          </p>

          {/* Actions */}
          <div className="mt-3 flex gap-4 text-gray-500">
            <Heart className="h-5 w-5" />
            <MessageCircle className="h-5 w-5" />
            <Repeat2 className="h-5 w-5" />
            <Send className="h-5 w-5" />
          </div>

          <p className="mt-2 text-xs text-gray-400">24 likes • 3 replies</p>
        </div>
      </div>
    </div>
  );
}
