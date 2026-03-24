"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { PublishResult } from "@/types";

interface StatusFeedProps {
  results: PublishResult[];
}

export function StatusFeed({ results }: StatusFeedProps) {
  if (results.length === 0) return null;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Publish Activity</h3>
      <div className="space-y-2">
        {results.map((result, i) => (
          <div
            key={`${result.contentId}-${i}`}
            className="flex items-center gap-3 rounded-md border px-3 py-2"
          >
            {result.status === "published" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : result.status === "failed" ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="text-muted-foreground h-4 w-4" />
            )}
            <span className="flex-1 text-sm">
              Content {result.contentId.slice(0, 8)}...
            </span>
            <Badge
              variant={
                result.status === "published"
                  ? "default"
                  : result.status === "failed"
                    ? "destructive"
                    : "secondary"
              }
            >
              {result.status}
            </Badge>
            {result.error && (
              <span className="text-destructive text-xs">{result.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
