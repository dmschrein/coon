"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProspectBoard } from "@/components/outreach/prospect-board";
import { NewProspectDialog } from "@/components/outreach/new-prospect-dialog";
import { ImportProspectsDialog } from "@/components/outreach/import-prospects-dialog";
import { DraftMessageDialog } from "@/components/outreach/draft-message-dialog";
import {
  useProspectList,
  useUpdateProspect,
  type Prospect,
} from "@/hooks/use-prospects";
import type { ProspectStatus } from "@/lib/validations/prospect";

export default function OutreachPage() {
  const { data, isLoading, error } = useProspectList({ limit: 100 });
  const updateProspect = useUpdateProspect();
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [draftFor, setDraftFor] = useState<Prospect | null>(null);

  function handleStatusChange(id: string, status: ProspectStatus) {
    updateProspect.mutate(
      { id, patch: { status } },
      {
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Outreach</h1>
          <p className="text-muted-foreground text-sm">
            Track and manage prospects across the funnel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            Import Prospects
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Prospect
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Loading prospects...
        </div>
      ) : error ? (
        <div className="text-destructive py-12 text-center text-sm">
          Failed to load prospects: {error.message}
        </div>
      ) : (
        <ProspectBoard
          prospects={data?.items ?? []}
          onStatusChange={handleStatusChange}
          onDraftMessage={(p) => setDraftFor(p)}
        />
      )}

      <NewProspectDialog open={newOpen} onOpenChange={setNewOpen} />
      <ImportProspectsDialog open={importOpen} onOpenChange={setImportOpen} />
      <DraftMessageDialog
        prospect={draftFor}
        open={draftFor !== null}
        onOpenChange={(o) => {
          if (!o) setDraftFor(null);
        }}
      />
    </div>
  );
}
