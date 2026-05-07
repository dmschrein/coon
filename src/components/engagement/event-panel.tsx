"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateEvent } from "@/hooks/use-events";
import { useCampaignContent } from "@/hooks/use-campaign";
import { eventInputSchema } from "@/lib/validations/event";
import { platformValues } from "@/lib/validations/content";

interface EventPanelProps {
  campaignId: string | null;
}

interface EventContentRow {
  id: string;
  body: string;
  platform: string;
  scheduledFor: string | null;
  contentType: string | null;
  eventTitle: string | null;
  eventDatetime: string | null;
  eventRsvpUrl: string | null;
}

const POST_TYPE_BADGES: Record<string, string> = {
  announcement: "Announcement",
  reminder: "Reminder",
  day_of: "Day of",
};

function inferPostType(
  scheduledFor: string | null,
  eventDatetime: string | null
): string {
  if (!scheduledFor || !eventDatetime) return "post";
  const diffHours =
    (new Date(eventDatetime).getTime() - new Date(scheduledFor).getTime()) /
    (1000 * 60 * 60);
  if (diffHours >= 6 * 24) return "announcement";
  if (diffHours >= 12) return "reminder";
  return "day_of";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function EventPanel({ campaignId }: EventPanelProps) {
  const [open, setOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [platform, setPlatform] = useState<(typeof platformValues)[number]>(
    platformValues[0]
  );
  const [eventDatetime, setEventDatetime] = useState("");
  const [eventRsvpUrl, setEventRsvpUrl] = useState("");

  const createEvent = useCreateEvent(campaignId ?? "");
  const { data: content } = useCampaignContent(campaignId ?? "");

  const events = (content as EventContentRow[] | undefined)?.filter(
    (c) => c.contentType === "event"
  );
  const noCampaign = !campaignId;

  const resetForm = () => {
    setEventTitle("");
    setEventDescription("");
    setPlatform(platformValues[0]);
    setEventDatetime("");
    setEventRsvpUrl("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) return;

    const isoDatetime = eventDatetime
      ? new Date(eventDatetime).toISOString()
      : "";
    const candidate = {
      eventTitle,
      eventDescription,
      platform,
      eventDatetime: isoDatetime,
      ...(eventRsvpUrl ? { eventRsvpUrl } : {}),
    };

    const parsed = eventInputSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    createEvent.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Event sequence created");
        resetForm();
        setOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      {noCampaign ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          You need an active campaign to schedule events.{" "}
          <Link
            href="/dashboard/campaign/new"
            className="text-primary underline"
          >
            Create one
          </Link>
          .
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} disabled={noCampaign}>
          Add Event
        </Button>
      </div>

      {events && events.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((evt) => {
            const postType = inferPostType(evt.scheduledFor, evt.eventDatetime);
            return (
              <Card key={evt.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {evt.eventTitle ?? "Untitled event"}
                    </CardTitle>
                    <Badge variant="secondary">
                      {POST_TYPE_BADGES[postType] ?? postType}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatDateTime(evt.eventDatetime)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-xs">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{evt.platform}</Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      Posts {formatDateTime(evt.scheduledFor)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-3">
                    {evt.body}
                  </p>
                  {evt.eventRsvpUrl ? (
                    <a
                      href={evt.eventRsvpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-xs underline"
                    >
                      RSVP link
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No events yet. Click <span className="font-medium">Add Event</span> to
          create your first one.
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add event</DialogTitle>
            <DialogDescription>
              We&apos;ll generate three posts: announcement, reminder, and
              day-of.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                required
                minLength={3}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                required
                minLength={10}
                maxLength={2000}
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-platform">Platform</Label>
                <Select
                  value={platform}
                  onValueChange={(v) =>
                    setPlatform(v as (typeof platformValues)[number])
                  }
                >
                  <SelectTrigger id="event-platform" className="w-full">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformValues.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-datetime">Date &amp; time</Label>
                <Input
                  id="event-datetime"
                  type="datetime-local"
                  value={eventDatetime}
                  onChange={(e) => setEventDatetime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-rsvp">RSVP URL (optional)</Label>
              <Input
                id="event-rsvp"
                type="url"
                value={eventRsvpUrl}
                onChange={(e) => setEventRsvpUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createEvent.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? "Creating…" : "Create event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
