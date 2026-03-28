"use client";

import { Clock } from "lucide-react";
import type { PostingTimeRecommendation } from "@/types";

interface PostingTimeCardProps {
  postingTime: PostingTimeRecommendation;
}

export function PostingTimeCard({ postingTime }: PostingTimeCardProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Best Posting Time</h4>
      <div className="flex items-center gap-2">
        <Clock className="text-primary h-4 w-4" />
        <span className="text-sm font-semibold">{postingTime.bestTime}</span>
        <span className="text-muted-foreground text-xs">
          ({postingTime.timezone})
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{postingTime.reasoning}</p>
      {postingTime.alternativeTimes.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Also good: {postingTime.alternativeTimes.join(", ")}
        </p>
      )}
    </div>
  );
}
