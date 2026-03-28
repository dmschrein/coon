"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import type { ContentApprovalStatus, CampaignPlatform } from "@/types";
import { ScoreBadge } from "./score-badge";

interface ContentCardProps {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
  hasMedia?: boolean;
  overallScore?: number;
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
  hasMedia,
  overallScore,
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
        <div className="flex items-center gap-1">
          <p className="line-clamp-2 flex-1 text-sm font-medium">
            {title ?? "Untitled content"}
          </p>
          {hasMedia && (
            <Camera className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {scheduledFor && (
            <p className="text-muted-foreground flex-1 text-xs">
              {new Date(scheduledFor).toLocaleDateString()}
            </p>
          )}
          {overallScore != null && <ScoreBadge score={overallScore} />}
        </div>
      </CardContent>
    </Card>
  );
}
