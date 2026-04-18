"use client";

import { Badge } from "@/components/ui/badge";
import type { HashtagAnalysis } from "@/types";

interface HashtagOptimizerProps {
  hashtags: HashtagAnalysis;
}

export function HashtagOptimizer({ hashtags }: HashtagOptimizerProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Hashtag Analysis</h4>

      {hashtags.current.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Current</p>
          <div className="flex flex-wrap gap-1">
            {hashtags.current.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hashtags.suggested.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Suggested</p>
          <div className="flex flex-wrap gap-1">
            {hashtags.suggested.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-green-100 text-xs text-green-800"
              >
                + {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hashtags.trending.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Trending</p>
          <div className="flex flex-wrap gap-1">
            {hashtags.trending.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-blue-100 text-xs text-blue-800"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hashtags.removed.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Remove</p>
          <div className="flex flex-wrap gap-1">
            {hashtags.removed.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-red-100 text-xs text-red-800 line-through"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hashtags.reasoning && (
        <p className="text-muted-foreground text-xs italic">
          {hashtags.reasoning}
        </p>
      )}
    </div>
  );
}
