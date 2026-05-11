"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBulkImportProspects } from "@/hooks/use-prospects";
import { bulkImportSchema } from "@/lib/validations/prospect";

const platformOptions = [
  "twitter",
  "instagram",
  "tiktok",
  "threads",
  "youtube",
  "reddit",
  "linkedin",
  "discord",
] as const;

interface ImportProspectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProspectsDialog({
  open,
  onOpenChange,
}: ImportProspectsDialogProps) {
  const bulkImport = useBulkImportProspects();
  const [platform, setPlatform] = useState<string>("twitter");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRaw("");
    setPlatform("twitter");
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const handles = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed = bulkImportSchema.safeParse({ handles, platform });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    bulkImport.mutate(parsed.data, {
      onSuccess: ({ inserted, skipped }) => {
        toast.success(`Imported ${inserted}, skipped ${skipped}`);
        reset();
        onOpenChange(false);
      },
      onError: (err) => {
        setError(err.message);
        toast.error(err.message);
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Prospects</DialogTitle>
          <DialogDescription>
            Paste handles, one per line. Duplicates are skipped automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="import-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platformOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-handles">Handles</Label>
            <Textarea
              id="import-handles"
              rows={8}
              placeholder={"@user1\n@user2\n@user3"}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {
                raw
                  .split(/\r?\n/)
                  .map((s) => s.trim())
                  .filter(Boolean).length
              }{" "}
              handles ready to import
            </p>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={bulkImport.isPending}>
              {bulkImport.isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
