"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Inbox } from "lucide-react";
import type { InboxItem } from "@/hooks/use-inbox";

interface ThreadViewProps {
  item: InboxItem | null;
}

const statusVariant: Record<
  string,
  { variant: "default" | "secondary" | "outline"; className?: string }
> = {
  unread: { variant: "default" },
  read: { variant: "secondary" },
  replied: { variant: "outline", className: "border-green-500 text-green-600" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ThreadView({ item }: ThreadViewProps) {
  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border">
        <Inbox className="text-muted-foreground h-12 w-12" />
        <p className="text-muted-foreground text-sm">
          Select a message to view
        </p>
      </div>
    );
  }

  const { variant, className: statusClassName } =
    statusVariant[item.status] ?? statusVariant.read;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">
            {item.authorDisplayName ?? item.authorHandle}
          </span>
          <Badge variant="secondary">{item.platform}</Badge>
          <Badge variant="outline" className="capitalize">
            {item.messageType}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {item.authorHandle} &middot; {formatDate(item.receivedAt)}
        </p>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 overflow-auto pt-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {item.messageText}
        </p>
      </CardContent>

      <Separator />

      <CardFooter className="gap-2 pt-4">
        <Badge variant={variant} className={statusClassName}>
          {item.status}
        </Badge>
        <span className="text-muted-foreground text-xs">
          Received {formatDate(item.receivedAt)}
        </span>
      </CardFooter>
    </Card>
  );
}
