"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePartnersList, type Partner } from "@/hooks/use-partners";
import { PartnerEditForm } from "./partner-edit-form";
import { NewPartnerDialog } from "./new-partner-dialog";

type SortKey = "name" | "status";
type SortDirection = "asc" | "desc";

const statusVariant: Record<
  string,
  { variant: "default" | "secondary" | "outline"; className?: string }
> = {
  prospect: { variant: "outline" },
  active: {
    variant: "default",
    className: "bg-green-600 hover:bg-green-600/90",
  },
  inactive: { variant: "secondary" },
};

function truncate(value: string | null, max = 60): string {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function PartnersTab() {
  const { data: partners, isLoading, error } = usePartnersList();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selected, setSelected] = useState<Partner | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const sorted = useMemo(() => {
    if (!partners) return [];
    const copy = [...partners];
    copy.sort((a, b) => {
      const cmp = (a[sortKey] ?? "")
        .toString()
        .localeCompare((b[sortKey] ?? "").toString(), undefined, {
          sensitivity: "base",
        });
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [partners, sortKey, sortDirection]);

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cross-Community Partners</h2>
          <p className="text-muted-foreground text-sm">
            Communities you partner with for cross-promo and collabs.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      {error ? (
        <div className="text-destructive py-12 text-center text-sm">
          Failed to load partners: {error.message}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border py-16 text-center">
          <Users className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No partners yet. Add your first community partner.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <SortableHeader
                  label="Name"
                  active={sortKey === "name"}
                  direction={sortDirection}
                  onClick={() => handleSortChange("name")}
                />
                <th className="px-4 py-3 text-left font-medium">Platform</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <SortableHeader
                  label="Status"
                  active={sortKey === "status"}
                  direction={sortDirection}
                  onClick={() => handleSortChange("status")}
                />
                <th className="px-4 py-3 text-left font-medium">
                  Collaboration Ideas
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((partner) => {
                const status =
                  statusVariant[partner.status] ?? statusVariant.prospect;
                const isSelected = selected?.id === partner.id;
                return (
                  <tr
                    key={partner.id}
                    onClick={() => setSelected(partner)}
                    className={cn(
                      "hover:bg-muted/50 cursor-pointer border-t transition-colors",
                      isSelected && "bg-muted"
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{partner.name}</td>
                    <td className="text-muted-foreground px-4 py-3 capitalize">
                      {partner.platform}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {partner.contactHandle ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={status.variant}
                        className={cn("capitalize", status.className)}
                      >
                        {partner.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {truncate(partner.collaborationIdeas)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>Edit Partner</SheetTitle>
                <SheetDescription>
                  Update {selected.name} or remove from your list.
                </SheetDescription>
              </SheetHeader>
              <PartnerEditForm
                key={selected.id}
                partner={selected}
                onClose={() => setSelected(null)}
              />
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <NewPartnerDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: SortableHeaderProps) {
  const Icon = !active
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <th className="px-4 py-3 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1 transition-colors",
          active && "text-foreground"
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  );
}
