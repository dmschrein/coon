"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AtSign,
  Globe,
  Instagram,
  Linkedin,
  MessageCircle,
  MessageSquareText,
  Music2,
  Sparkles,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProspectStatus } from "@/lib/validations/prospect";
import type { Prospect } from "@/hooks/use-prospects";

interface ProspectCardProps {
  prospect: Prospect;
  onDraftMessage: (prospect: Prospect) => void;
  isDragOverlay?: boolean;
}

const platformIcons: Record<string, LucideIcon> = {
  twitter: Twitter,
  instagram: Instagram,
  tiktok: Music2,
  threads: AtSign,
  youtube: Youtube,
  reddit: MessageSquareText,
  linkedin: Linkedin,
};

const statusColors: Record<ProspectStatus, string> = {
  cold: "bg-slate-100 text-slate-800",
  contacted: "bg-blue-100 text-blue-800",
  responded: "bg-yellow-100 text-yellow-800",
  joined: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "Never contacted";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "Just now";
  const m = Math.round(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

export function ProspectCard({
  prospect,
  onDraftMessage,
  isDragOverlay = false,
}: ProspectCardProps) {
  const sortable = useSortable({
    id: prospect.id,
    disabled: isDragOverlay,
  });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.5 : 1,
      };

  const PlatformIcon = platformIcons[prospect.platform] ?? Globe;
  const visibleTags = prospect.tags.slice(0, 3);
  const overflowCount = prospect.tags.length - visibleTags.length;

  return (
    <Card
      ref={isDragOverlay ? undefined : sortable.setNodeRef}
      style={style}
      className={cn(
        "cursor-grab select-none active:cursor-grabbing",
        isDragOverlay && "shadow-lg"
      )}
      {...(isDragOverlay ? {} : sortable.attributes)}
      {...(isDragOverlay ? {} : sortable.listeners)}
    >
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <PlatformIcon className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="truncate text-sm font-medium">
              @{prospect.handle.replace(/^@/, "")}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {prospect.platform}
          </Badge>
        </div>

        <div>
          <Badge className={cn("text-xs", statusColors[prospect.status])}>
            {prospect.status}
          </Badge>
        </div>

        {prospect.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {overflowCount > 0 ? (
              <Badge variant="secondary" className="text-xs">
                +{overflowCount}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{relativeTime(prospect.lastContactedAt)}</span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {prospect.contactedCount}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDraftMessage(prospect)}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Draft Message
        </Button>
      </CardContent>
    </Card>
  );
}
