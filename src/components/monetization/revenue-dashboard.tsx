"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { csvFromRows, formatCurrency } from "@/lib/utils";
import type { RevenueEntry } from "@/lib/validations/revenue";
import {
  useRevenueList,
  useMRRSummary,
  useDeleteRevenueEntry,
} from "@/hooks/use-revenue";
import { RevenueCharts } from "./revenue-charts";
import { RevenueTable } from "./revenue-table";
import { RevenueForm } from "./revenue-form";

function buildCsvHref(entries: RevenueEntry[]): string {
  const csv = csvFromRows(
    ["Date", "Source", "Type", "Amount (USD)", "Notes"],
    entries.map((e) => [
      e.date.slice(0, 10),
      e.source ?? "",
      e.type,
      (e.amountCents / 100).toFixed(2),
      e.notes ?? "",
    ])
  );
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function computeDelta(thisMonth: number, lastMonth: number): number | null {
  if (lastMonth === 0) return null;
  return ((thisMonth - lastMonth) / lastMonth) * 100;
}

export function RevenueDashboard() {
  const { data: entries, isLoading } = useRevenueList();
  const { data: summary } = useMRRSummary();
  const deleteEntry = useDeleteRevenueEntry();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueEntry | null>(null);

  const items = entries ?? [];
  const thisMonth = summary?.thisMonth ?? 0;
  const lastMonth = summary?.lastMonth ?? 0;
  const delta = useMemo(
    () => computeDelta(thisMonth, lastMonth),
    [thisMonth, lastMonth]
  );

  const handleExport = () => {
    if (typeof window === "undefined") return;
    window.location.href = buildCsvHref(items);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this entry?")) deleteEntry.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Revenue</h1>
          <p className="text-muted-foreground text-sm">
            Track monthly revenue and break it down by type.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>Add Revenue</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>MRR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                This Month
              </p>
              <p className="text-3xl font-bold">{formatCurrency(thisMonth)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                Last Month
              </p>
              <p className="text-3xl font-bold">{formatCurrency(lastMonth)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Delta</p>
              <p
                className={
                  "text-2xl font-semibold " +
                  (delta == null
                    ? "text-muted-foreground"
                    : delta >= 0
                      ? "text-green-600"
                      : "text-red-600")
                }
              >
                {delta == null
                  ? "—"
                  : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RevenueCharts entries={items} />

      <RevenueTable
        entries={items}
        onEdit={setEditing}
        onDelete={handleDelete}
      />

      <RevenueForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />
      <RevenueForm
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        mode="edit"
        entry={editing}
      />
    </div>
  );
}
