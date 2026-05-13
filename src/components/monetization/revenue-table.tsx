"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { RevenueEntry } from "@/lib/validations/revenue";

interface RevenueTableProps {
  entries: RevenueEntry[];
  onEdit: (entry: RevenueEntry) => void;
  onDelete: (id: string) => void;
}

export function RevenueTable({ entries, onEdit, onDelete }: RevenueTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No revenue entries yet. Click &ldquo;Add Revenue&rdquo; to get
            started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="py-2 pr-2 font-medium">Date</th>
                <th className="py-2 pr-2 font-medium">Source</th>
                <th className="py-2 pr-2 font-medium">Type</th>
                <th className="py-2 pr-2 font-medium">Amount</th>
                <th className="py-2 pr-2 font-medium">Notes</th>
                <th className="py-2 pr-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">{e.date.slice(0, 10)}</td>
                  <td className="py-2 pr-2">{e.source ?? "—"}</td>
                  <td className="py-2 pr-2">
                    <Badge variant="secondary">{e.type}</Badge>
                  </td>
                  <td className="py-2 pr-2 font-medium">
                    {formatCurrency(e.amountCents)}
                  </td>
                  <td className="text-muted-foreground py-2 pr-2">
                    {e.notes ?? ""}
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(e)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(e.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
