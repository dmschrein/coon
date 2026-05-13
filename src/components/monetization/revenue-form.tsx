"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  revenueTypeValues,
  type RevenueCreate,
  type RevenueEntry,
  type RevenueType,
} from "@/lib/validations/revenue";
import {
  useCreateRevenueEntry,
  useUpdateRevenueEntry,
} from "@/hooks/use-revenue";

interface FormValues {
  date: string;
  source: string;
  type: RevenueType;
  amountDollars: number | "";
  notes: string;
}

interface RevenueFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  entry?: RevenueEntry | null;
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function RevenueForm({
  open,
  onOpenChange,
  mode,
  entry,
}: RevenueFormProps) {
  const createEntry = useCreateRevenueEntry();
  const updateEntry = useUpdateRevenueEntry();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      date: todayIsoDate(),
      source: "",
      type: "membership",
      amountDollars: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (mode === "edit" && entry) {
      reset({
        date: entry.date.slice(0, 10),
        source: entry.source ?? "",
        type: entry.type,
        amountDollars: entry.amountCents / 100,
        notes: entry.notes ?? "",
      });
    } else if (mode === "create" && open) {
      reset({
        date: todayIsoDate(),
        source: "",
        type: "membership",
        amountDollars: "",
        notes: "",
      });
    }
  }, [mode, entry, open, reset]);

  const onSubmit = (values: FormValues) => {
    const dollars =
      values.amountDollars === "" || values.amountDollars === undefined
        ? 0
        : Number(values.amountDollars);
    const cents = Math.round(dollars * 100);

    const payload: RevenueCreate = {
      date: new Date(`${values.date}T00:00:00Z`),
      source: values.source.trim() || null,
      type: values.type,
      amountCents: cents,
      notes: values.notes.trim() || null,
    };

    if (mode === "create") {
      createEntry.mutate(payload, {
        onSuccess: () => {
          toast.success("Revenue entry added");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (entry) {
      updateEntry.mutate(
        { id: entry.id, patch: payload },
        {
          onSuccess: () => {
            toast.success("Revenue entry updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const isPending =
    mode === "create" ? createEntry.isPending : updateEntry.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Revenue" : "Edit Revenue Entry"}
          </DialogTitle>
          <DialogDescription>
            Record a revenue event so it shows in the dashboard charts and CSV
            export.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="revenue-date">Date *</Label>
              <Input
                id="revenue-date"
                type="date"
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && (
                <p className="text-destructive text-sm">
                  {errors.date.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue-amount">Amount (USD) *</Label>
              <Input
                id="revenue-amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="29.00"
                {...register("amountDollars", {
                  valueAsNumber: true,
                  required: "Amount is required",
                })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="revenue-type">Type</Label>
              <select
                id="revenue-type"
                className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                {...register("type")}
              >
                {revenueTypeValues.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue-source">Source</Label>
              <Input
                id="revenue-source"
                placeholder="Patreon, Acme Corp…"
                {...register("source")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="revenue-notes">Notes</Label>
            <Textarea id="revenue-notes" rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? mode === "create"
                  ? "Adding…"
                  : "Saving…"
                : mode === "create"
                  ? "Add"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
