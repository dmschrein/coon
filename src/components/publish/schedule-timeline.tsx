"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { CampaignPlatform, ContentApprovalStatus } from "@/types";

interface ContentItem {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  body: string | null;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
  externalPostUrl: string | null;
  postedAt: Date | null;
}

interface ScheduleTimelineProps {
  items: ContentItem[];
  publishingId: string | null;
  onPublish: (contentId: string) => void;
}

export function ScheduleTimeline({
  items,
  publishingId,
  onPublish,
}: ScheduleTimelineProps) {
  const approvedItems = items.filter((i) => i.approvalStatus === "approved");

  if (approvedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <Clock className="text-muted-foreground h-12 w-12" />
        <h3 className="mt-4 text-lg font-semibold">No Approved Content</h3>
        <p className="text-muted-foreground mt-2 text-center text-sm">
          Approve content in the Review Board before publishing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approvedItems.map((item) => {
        const isPublished = !!item.postedAt || !!item.externalPostUrl;
        const isPublishing = publishingId === item.id;

        return (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              {isPublished ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="text-muted-foreground h-5 w-5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {item.title ?? "Untitled"}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.platform}
                  </Badge>
                  {item.pillar && (
                    <Badge variant="secondary" className="text-xs">
                      {item.pillar}
                    </Badge>
                  )}
                </div>
                {item.scheduledFor && (
                  <p className="text-muted-foreground text-xs">
                    Scheduled: {new Date(item.scheduledFor).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPublished ? (
                item.externalPostUrl ? (
                  <a
                    href={item.externalPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      View Post
                    </Button>
                  </a>
                ) : (
                  <Badge variant="default">Published</Badge>
                )
              ) : (
                <Button
                  size="sm"
                  onClick={() => onPublish(item.id)}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1 h-3 w-3" />
                      Publish Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
