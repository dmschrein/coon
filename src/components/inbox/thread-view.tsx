"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Inbox, MessageSquareReply } from "lucide-react";
import { ReplyComposer } from "./reply-composer";
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
  const [showComposer, setShowComposer] = useState(false);
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

      <CardFooter className="flex-col items-stretch gap-3 pt-4">
        <div className="flex items-center gap-2">
          <Badge variant={variant} className={statusClassName}>
            {item.status}
          </Badge>
          <span className="text-muted-foreground text-xs">
            Received {formatDate(item.receivedAt)}
          </span>
          {item.status !== "replied" && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => setShowComposer((prev) => !prev)}
            >
              <MessageSquareReply className="mr-1.5 h-3.5 w-3.5" />
              {showComposer ? "Hide Reply" : "Draft Reply"}
            </Button>
          )}
        </div>

        {showComposer && (
          <>
            <Separator />
            <ReplyComposer
              item={item}
              onReplied={() => setShowComposer(false)}
            />
          </>
        )}
      </CardFooter>
    </Card>
  );
}
