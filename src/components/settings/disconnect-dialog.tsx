"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformLabel: string;
  onConfirm: () => void;
  isPending: boolean;
}

export function DisconnectDialog({
  open,
  onOpenChange,
  platformLabel,
  onConfirm,
  isPending,
}: DisconnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect {platformLabel}?</DialogTitle>
          <DialogDescription>
            Are you sure you want to disconnect your {platformLabel} account?
            You&apos;ll need to re-authorize to post directly from Community
            Builder again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
