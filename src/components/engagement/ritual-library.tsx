"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useActivateRitual,
  useDeactivateRitual,
  useRituals,
  type RitualTemplateClient,
} from "@/hooks/use-rituals";

interface RitualLibraryProps {
  campaignId: string | null;
  initialTemplates: RitualTemplateClient[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function recurrenceLabel(
  recurrence: RitualTemplateClient["recurrence"],
  dayOfWeek: number | null
): string {
  if (recurrence === "monthly") return "Monthly";
  const day =
    dayOfWeek !== null && dayOfWeek >= 0 && dayOfWeek <= 6
      ? DAY_NAMES[dayOfWeek]
      : "";
  const label = recurrence === "biweekly" ? "Biweekly" : "Weekly";
  return day ? `${label} · ${day}` : label;
}

export function RitualLibrary({
  campaignId,
  initialTemplates,
}: RitualLibraryProps) {
  const { data } = useRituals(initialTemplates);
  const activate = useActivateRitual();
  const deactivate = useDeactivateRitual();
  const [pendingDeactivate, setPendingDeactivate] =
    useState<RitualTemplateClient | null>(null);

  const items = data?.items ?? [];
  const noCampaign = !campaignId;

  const handleActivate = (ritual: RitualTemplateClient) => {
    if (!campaignId) return;
    activate.mutate(
      { id: ritual.id, campaignId },
      {
        onSuccess: () =>
          toast.success(`Activated "${ritual.name}" — 8 entries scheduled`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const confirmDeactivate = () => {
    if (!pendingDeactivate) return;
    const ritual = pendingDeactivate;
    deactivate.mutate(
      { id: ritual.id },
      {
        onSuccess: () => {
          toast.success(`Deactivated "${ritual.name}"`);
          setPendingDeactivate(null);
        },
        onError: (err) => {
          toast.error(err.message);
          setPendingDeactivate(null);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {noCampaign ? (
        <div className="bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          You need an active campaign to schedule rituals.{" "}
          <Link
            href="/dashboard/campaign/new"
            className="text-primary underline"
          >
            Create one
          </Link>
          .
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((ritual) => {
          const isPending =
            (activate.isPending && activate.variables?.id === ritual.id) ||
            (deactivate.isPending && deactivate.variables?.id === ritual.id);
          return (
            <Card key={ritual.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{ritual.name}</CardTitle>
                  {ritual.isActive ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : null}
                </div>
                <CardDescription>{ritual.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-xs">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{ritual.platform}</Badge>
                  <Badge variant="outline">
                    {recurrenceLabel(ritual.recurrence, ritual.dayOfWeek)}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-3">
                  {ritual.promptTemplate}
                </p>
              </CardContent>
              <CardFooter>
                {ritual.isActive ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setPendingDeactivate(ritual)}
                    disabled={isPending}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleActivate(ritual)}
                    disabled={isPending || noCampaign}
                  >
                    Activate
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => !open && setPendingDeactivate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate ritual?</DialogTitle>
            <DialogDescription>
              Future calendar entries for &quot;{pendingDeactivate?.name}&quot;
              will be removed. Past entries are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeactivate(null)}
              disabled={deactivate.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
              disabled={deactivate.isPending}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
