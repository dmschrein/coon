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
import {
  Inbox,
  MessageSquareReply,
  Check,
  EyeOff,
  ShieldX,
  ShieldAlert,
} from "lucide-react";
import { ReplyComposer } from "./reply-composer";
import { useModerationAction, type InboxItem } from "@/hooks/use-inbox";
import { toast } from "sonner";

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
  const moderate = useModerationAction();

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

  const handleModerate = (action: "approve" | "hide" | "block_sender") => {
    moderate.mutate(
      { id: item.id, action },
      {
        onSuccess: (data) => {
          if (action === "approve") toast.success("Approved — flag cleared");
          else if (action === "hide") toast.success("Item hidden");
          else
            toast.success(
              `Sender blocked (${data.affectedItems} item${data.affectedItems === 1 ? "" : "s"} marked read)`
            );
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

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
          {item.flagged && (
            <Badge variant="destructive" className="capitalize">
              <ShieldAlert className="mr-1 h-3 w-3" />
              {item.flagCategory ?? "Flagged"}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {item.authorHandle} &middot; {formatDate(item.receivedAt)}
        </p>
        {item.flagged && item.flagReason && (
          <p className="text-destructive text-xs">
            <span className="font-semibold">Flag reason:</span>{" "}
            {item.flagReason}
          </p>
        )}
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

        {item.flagged && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={moderate.isPending}
              onClick={() => handleModerate("approve")}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={moderate.isPending}
              onClick={() => handleModerate("hide")}
            >
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              Hide
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={moderate.isPending}
              onClick={() => handleModerate("block_sender")}
            >
              <ShieldX className="mr-1.5 h-3.5 w-3.5" />
              Block sender
            </Button>
          </div>
        )}

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
