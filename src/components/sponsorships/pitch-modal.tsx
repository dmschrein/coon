"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface PitchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pitch: {
    subject: string;
    body: string;
    followUp: string;
  } | null;
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

export function PitchModal({ open, onOpenChange, pitch }: PitchModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generated pitch</DialogTitle>
          <DialogDescription>
            Review and copy. The pitch is grounded in your real audience
            metrics.
          </DialogDescription>
        </DialogHeader>
        {pitch && (
          <div className="space-y-4">
            <Section
              label="Subject"
              value={pitch.subject}
              rows={1}
              onCopy={() => copyToClipboard(pitch.subject, "Subject")}
            />
            <Section
              label="Body"
              value={pitch.body}
              rows={8}
              onCopy={() => copyToClipboard(pitch.body, "Body")}
            />
            <Section
              label="Follow-up"
              value={pitch.followUp}
              rows={3}
              onCopy={() => copyToClipboard(pitch.followUp, "Follow-up")}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SectionProps {
  label: string;
  value: string;
  rows: number;
  onCopy: () => void;
}

function Section({ label, value, rows, onCopy }: SectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          className="h-7 text-xs"
        >
          Copy
        </Button>
      </div>
      <Textarea value={value} rows={rows} readOnly className="resize-none" />
    </div>
  );
}
