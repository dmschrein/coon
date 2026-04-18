"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import type {
  ContentApprovalStatus,
  CampaignPlatform,
  ReviewBoardColumn,
} from "@/types";
import { ScoreBadge } from "./score-badge";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  scheduledFor: Date | null;
  approvalStatus: ContentApprovalStatus;
  boardColumn: ReviewBoardColumn;
  contentType?: string | null;
  aiConfidenceScore?: number | null;
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

const platformColors: Record<string, string> = {
  twitter: "bg-sky-100",
  instagram: "bg-pink-100",
  tiktok: "bg-slate-100",
  threads: "bg-gray-100",
  youtube: "bg-red-100",
  reddit: "bg-orange-100",
  linkedin: "bg-blue-100",
  discord: "bg-indigo-100",
  email: "bg-emerald-100",
  blog: "bg-violet-100",
  pinterest: "bg-rose-100",
};

function ConfidenceDot({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} />;
}

export function ContentCard({
  id,
  platform,
  title,
  pillar,
  scheduledFor,
  approvalStatus,
  contentType,
  aiConfidenceScore,
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
        {/* Thumbnail placeholder */}
        <div
          className={cn(
            "flex h-8 items-center justify-center rounded text-xs font-medium",
            platformColors[platform] ?? "bg-gray-100"
          )}
        >
          {platformLabels[platform] ?? platform}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            {platformLabels[platform] ?? platform}
          </Badge>
          {contentType && (
            <Badge variant="secondary" className="text-xs capitalize">
              {contentType}
            </Badge>
          )}
          {pillar && (
            <Badge variant="secondary" className="text-xs">
              {pillar}
            </Badge>
          )}
          {approvalStatus === "needs_revision" && (
            <Badge variant="destructive" className="text-xs">
              Edit
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

        <div className="flex items-center gap-1.5">
          {scheduledFor && (
            <p className="text-muted-foreground flex-1 text-xs">
              {new Date(scheduledFor).toLocaleDateString()}
            </p>
          )}
          {aiConfidenceScore != null && (
            <ConfidenceDot score={aiConfidenceScore} />
          )}
          {overallScore != null && <ScoreBadge score={overallScore} />}
        </div>
      </CardContent>
    </Card>
  );
}
