"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InboxFilterBar } from "@/components/inbox/inbox-filter-bar";
import { InboxList } from "@/components/inbox/inbox-list";
import { ThreadView } from "@/components/inbox/thread-view";
import {
  useInboxList,
  useUpdateInboxStatus,
  type InboxItem,
  type InboxFilters,
} from "@/hooks/use-inbox";

export default function InboxPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "inbox";

  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [filters, setFilters] = useState<{
    status: string | null;
    platform: string | null;
  }>({ status: null, platform: null });

  const queryFilters: InboxFilters = {};
  if (filters.status)
    queryFilters.status = filters.status as InboxFilters["status"];
  if (filters.platform) queryFilters.platform = filters.platform;

  const { data: inboxData, isLoading: isInboxLoading } =
    useInboxList(queryFilters);
  const { data: flaggedData, isLoading: isFlaggedLoading } = useInboxList({
    flagged: true,
  });
  const updateStatus = useUpdateInboxStatus();

  const platforms = inboxData?.items
    ? [...new Set(inboxData.items.map((item) => item.platform))]
    : [];

  const handleSelect = useCallback(
    (item: InboxItem) => {
      setSelectedItem(item);
      if (item.status === "unread") {
        updateStatus.mutate({ id: item.id, status: "read" });
      }
    },
    [updateStatus]
  );

  const flaggedCount = flaggedData?.total ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Community engagement messages
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="moderation">
            Moderation Queue
            {flaggedCount > 0 ? ` (${flaggedCount})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4 space-y-4">
          <InboxFilterBar
            activeStatus={filters.status}
            activePlatform={filters.platform}
            platforms={platforms}
            onStatusChange={(status) =>
              setFilters((prev) => ({ ...prev, status }))
            }
            onPlatformChange={(platform) =>
              setFilters((prev) => ({ ...prev, platform }))
            }
          />

          <div className="flex gap-4" style={{ height: "calc(100vh - 280px)" }}>
            <div className="w-1/3 overflow-hidden rounded-lg border">
              <ScrollArea className="h-full">
                <InboxList
                  items={inboxData?.items ?? []}
                  selectedId={selectedItem?.id ?? null}
                  onSelect={handleSelect}
                  isLoading={isInboxLoading}
                />
              </ScrollArea>
            </div>
            <div className="flex-1 overflow-hidden">
              <ThreadView item={selectedItem} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="moderation" className="mt-4">
          <div className="flex gap-4" style={{ height: "calc(100vh - 240px)" }}>
            <div className="w-1/3 overflow-hidden rounded-lg border">
              <ScrollArea className="h-full">
                <InboxList
                  items={flaggedData?.items ?? []}
                  selectedId={selectedItem?.id ?? null}
                  onSelect={handleSelect}
                  isLoading={isFlaggedLoading}
                />
              </ScrollArea>
            </div>
            <div className="flex-1 overflow-hidden">
              <ThreadView item={selectedItem} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
