"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useRefineProfile,
  useApplyRefinements,
} from "@/hooks/use-audience-profile";
import type { AudienceProfileChange } from "@/types";

interface ProfileRefinementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFieldPath(field: string): string {
  return field
    .replace(/\[(\d+)\]/g, " [$1]")
    .split(".")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" > ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ChangeRow({
  change,
  accepted,
  onToggle,
}: {
  change: AudienceProfileChange;
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Checkbox
        checked={accepted}
        onCheckedChange={onToggle}
        className="mt-1"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{formatFieldPath(change.field)}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-destructive line-through">
            {formatValue(change.oldValue)}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-green-600">{formatValue(change.newValue)}</span>
        </div>
        <p className="text-muted-foreground text-xs">{change.reason}</p>
      </div>
    </div>
  );
}

export function ProfileRefinementModal({
  open,
  onOpenChange,
}: ProfileRefinementModalProps) {
  const refine = useRefineProfile();
  const apply = useApplyRefinements();
  const [acceptedSet, setAcceptedSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      refine.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (refine.data?.changes) {
      setAcceptedSet(new Set(refine.data.changes.map((_, i) => i)));
    }
  }, [refine.data]);

  function handleClose() {
    onOpenChange(false);
    refine.reset();
    setAcceptedSet(new Set());
  }

  function toggleChange(index: number) {
    setAcceptedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function acceptAll() {
    if (!refine.data) return;
    setAcceptedSet(new Set(refine.data.changes.map((_, i) => i)));
  }

  function rejectAll() {
    setAcceptedSet(new Set());
  }

  async function handleApply() {
    if (!refine.data) return;
    const accepted = refine.data.changes.filter((_, i) => acceptedSet.has(i));
    if (accepted.length === 0) return;

    try {
      await apply.mutateAsync(accepted);
      toast.success("Profile updated with refinements");
      handleClose();
    } catch {
      toast.error("Failed to apply refinements. Please try again.");
    }
  }

  const changes = refine.data?.changes ?? [];
  const acceptedCount = acceptedSet.size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Refine from Performance Data</DialogTitle>
          <DialogDescription>
            {refine.isPending
              ? "Analyzing your performance data..."
              : refine.data
                ? refine.data.summary
                : "Review AI-suggested changes to your audience profile."}
          </DialogDescription>
        </DialogHeader>

        {refine.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-4 text-sm">
              Analyzing performance data — this may take up to a minute.
            </p>
          </div>
        )}

        {refine.isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <AlertCircle className="text-destructive h-8 w-8" />
            <p className="text-destructive text-sm">
              {refine.error?.message ?? "Failed to analyze performance data."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refine.mutate()}>
              Retry
            </Button>
          </div>
        )}

        {refine.isSuccess && changes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">
              Your profile is already well-optimized — no changes suggested.
            </p>
          </div>
        )}

        {refine.isSuccess && changes.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {changes.length} change{changes.length !== 1 && "s"}
              </Badge>
              <Badge variant="outline">
                Confidence: {Math.round((refine.data?.confidence ?? 0) * 100)}%
              </Badge>
            </div>

            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2 pr-4">
                {changes.map((change, i) => (
                  <ChangeRow
                    key={i}
                    change={change}
                    accepted={acceptedSet.has(i)}
                    onToggle={() => toggleChange(i)}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          {refine.isSuccess && changes.length > 0 ? (
            <>
              <Button variant="outline" size="sm" onClick={rejectAll}>
                Reject All
              </Button>
              <Button variant="outline" size="sm" onClick={acceptAll}>
                Accept All
              </Button>
              <Button
                onClick={handleApply}
                disabled={acceptedCount === 0 || apply.isPending}
                size="sm"
              >
                {apply.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  `Apply ${acceptedCount} Change${acceptedCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
