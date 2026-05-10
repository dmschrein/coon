"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProspectBoard } from "@/components/outreach/prospect-board";
import { NewProspectDialog } from "@/components/outreach/new-prospect-dialog";
import { ImportProspectsDialog } from "@/components/outreach/import-prospects-dialog";
import { DraftMessageDialog } from "@/components/outreach/draft-message-dialog";
import { PartnersTab } from "@/components/outreach/partners-tab";
import {
  useProspectList,
  useUpdateProspect,
  type Prospect,
} from "@/hooks/use-prospects";
import { useRecentContent } from "@/hooks/use-growth";
import type { ProspectStatus } from "@/lib/validations/prospect";

export default function OutreachPage() {
  const { data, isLoading, error } = useProspectList({ limit: 100 });
  const updateProspect = useUpdateProspect();
  const { data: recentContent } = useRecentContent();
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

  function handleMarkJoined(prospect: Prospect, contentId: string) {
    updateProspect.mutate(
      {
        id: prospect.id,
        patch: { status: "joined", convertedFromContentId: contentId },
      },
      {
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Outreach</h1>
        <p className="text-muted-foreground text-sm">
          Track prospects and partner communities across your funnel.
        </p>
      </div>

      <Tabs defaultValue="prospects">
        <TabsList>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="mt-6 space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1 h-4 w-4" />
              Import Prospects
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Prospect
            </Button>
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
              onMarkJoined={handleMarkJoined}
              recentContent={recentContent ?? []}
            />
          )}
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          <PartnersTab />
        </TabsContent>
      </Tabs>

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
