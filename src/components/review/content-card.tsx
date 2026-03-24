"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentApprovalStatus, CampaignPlatform } from "@/types";

interface ContentCardProps {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
  onClick: () => void;
}

const platformLabels: Record<string, string> = {
  twitter: "Twitter/X",
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  youtube: "YouTube",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  discord: "Discord",
  email: "Email",
  blog: "Blog",
  pinterest: "Pinterest",
};

export function ContentCard({
  id,
  platform,
  title,
  pillar,
  scheduledFor,
  onClick,
}: ContentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-2 cursor-grab active:cursor-grabbing"
      onClick={onClick}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {platformLabels[platform] ?? platform}
          </Badge>
          {pillar && (
            <Badge variant="secondary" className="text-xs">
              {pillar}
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-sm font-medium">
          {title ?? "Untitled content"}
        </p>
        {scheduledFor && (
          <p className="text-muted-foreground text-xs">
            {new Date(scheduledFor).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
