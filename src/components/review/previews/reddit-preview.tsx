"use client";

import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2 } from "lucide-react";

interface RedditPreviewProps {
  title: string | null;
  body: string | null;
  contentData: unknown;
}

export function RedditPreview({
  title,
  body,
  contentData,
}: RedditPreviewProps) {
  const data = contentData as Record<string, unknown> | null;
  const subreddit =
    (data?.subreddit as string) ??
    (data?.targetSubreddit as string) ??
    "community";
  const postTitle = title ?? (data?.title as string) ?? "Untitled post";
  const postBody = body ?? (data?.body as string) ?? "";

  return (
    <div className="mx-auto w-full max-w-[450px] rounded-lg border bg-white">
      <div className="flex">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-0.5 bg-gray-50 px-2 py-3">
          <ArrowBigUp className="h-5 w-5 text-gray-400" />
          <span className="text-xs font-bold text-gray-700">42</span>
          <ArrowBigDown className="h-5 w-5 text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex-1 p-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="font-bold text-black">r/{subreddit}</span>
            <span>•</span>
            <span>Posted by u/yourbrand</span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-black">{postTitle}</h3>
          {postBody && (
            <p className="mt-2 line-clamp-4 text-xs text-gray-700">
              {postBody}
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>15 Comments</span>
            </div>
            <div className="flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
