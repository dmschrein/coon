"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Reply, AtSign, Mail, Inbox } from "lucide-react";
import type { InboxItem } from "@/hooks/use-inbox";

interface InboxListProps {
  items: InboxItem[];
  selectedId: string | null;
  onSelect: (item: InboxItem) => void;
  isLoading: boolean;
}

const messageTypeIcons: Record<string, typeof MessageSquare> = {
  comment: MessageSquare,
  reply: Reply,
  mention: AtSign,
  dm: Mail,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}

export function InboxList({
  items,
  selectedId,
  onSelect,
  isLoading,
}: InboxListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Inbox className="text-muted-foreground h-10 w-10" />
        <p className="text-muted-foreground text-sm">No messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {items.map((item) => {
        const Icon = messageTypeIcons[item.messageType] ?? MessageSquare;
        const isUnread = item.status === "unread";
        const isSelected = selectedId === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "hover:bg-accent relative flex w-full cursor-pointer gap-3 rounded-lg p-3 text-left transition-colors",
              isSelected && "bg-accent",
              isUnread && "border-l-primary border-l-2"
            )}
          >
            <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    isUnread && "font-semibold"
                  )}
                >
                  {item.authorHandle}
                </span>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {item.platform}
                </Badge>
                <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                  {timeAgo(item.receivedAt)}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {truncate(item.messageText, 80)}
              </p>
            </div>
            {isUnread && (
              <span className="bg-primary absolute top-2 right-2 h-2 w-2 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
