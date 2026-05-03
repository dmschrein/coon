"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  type NotificationItem,
} from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w ago`;
  return new Date(iso).toLocaleDateString();
}

interface NotificationRowProps {
  item: NotificationItem;
}

function NotificationRow({ item }: NotificationRowProps) {
  const body = (
    <div
      className={cn(
        "hover:bg-accent flex flex-col gap-1 rounded-md p-3",
        !item.read && "bg-accent/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-tight font-medium">{item.title}</p>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatRelative(item.createdAt)}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{item.body}</p>
    </div>
  );

  return item.link ? (
    <Link href={item.link} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function NotificationBell() {
  const { data, isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              data-testid="notification-badge"
              className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-semibold text-white"
            >
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={markAllRead.isPending || unreadCount === 0}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {isLoading ? (
            <p className="text-muted-foreground p-4 text-center text-sm">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center text-sm">
              No notifications yet
            </p>
          ) : (
            items.map((item) => <NotificationRow key={item.id} item={item} />)
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
