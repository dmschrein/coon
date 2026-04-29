"use client";

import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [filters, setFilters] = useState<{
    status: string | null;
    platform: string | null;
  }>({ status: null, platform: null });

  const queryFilters: InboxFilters = {};
  if (filters.status)
    queryFilters.status = filters.status as InboxFilters["status"];
  if (filters.platform) queryFilters.platform = filters.platform;

  const { data, isLoading } = useInboxList(queryFilters);
  const updateStatus = useUpdateInboxStatus();

  const platforms = data?.items
    ? [...new Set(data.items.map((item) => item.platform))]
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Community engagement messages
        </p>
      </div>

      <InboxFilterBar
        activeStatus={filters.status}
        activePlatform={filters.platform}
        platforms={platforms}
        onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
        onPlatformChange={(platform) =>
          setFilters((prev) => ({ ...prev, platform }))
        }
      />

      <div className="flex gap-4" style={{ height: "calc(100vh - 240px)" }}>
        <div className="w-1/3 overflow-hidden rounded-lg border">
          <ScrollArea className="h-full">
            <InboxList
              items={data?.items ?? []}
              selectedId={selectedItem?.id ?? null}
              onSelect={handleSelect}
              isLoading={isLoading}
            />
          </ScrollArea>
        </div>
        <div className="flex-1 overflow-hidden">
          <ThreadView item={selectedItem} />
        </div>
      </div>
    </div>
  );
}
