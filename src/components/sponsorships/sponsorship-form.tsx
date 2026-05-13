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
  sponsorStatusValues,
  type Sponsor,
  type SponsorCreate,
} from "@/lib/validations/sponsor";
import { useCreateSponsor, useUpdateSponsor } from "@/hooks/use-sponsors";

interface FormValues {
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  // Dollars in the form — converted to cents on submit.
  dealValueDollars?: number | "";
  status: (typeof sponsorStatusValues)[number];
  deliverables?: string;
  notes?: string;
}

interface SponsorshipFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sponsor?: Sponsor | null;
}

export function SponsorshipForm({
  open,
  onOpenChange,
  mode,
  sponsor,
}: SponsorshipFormProps) {
  const createSponsor = useCreateSponsor();
  const updateSponsor = useUpdateSponsor();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // Form fields don't match SponsorCreate 1:1 (dealValueDollars is in dollars
    // here, cents server-side), so we skip the Zod resolver and rely on the
    // server-side sponsorCreateSchema for validation. We require companyName
    // client-side via the rule below.
    defaultValues: {
      companyName: "",
      contactName: "",
      contactEmail: "",
      dealValueDollars: "",
      status: "outreach",
      deliverables: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (mode === "edit" && sponsor) {
      reset({
        companyName: sponsor.companyName,
        contactName: sponsor.contactName ?? "",
        contactEmail: sponsor.contactEmail ?? "",
        dealValueDollars:
          sponsor.dealValue != null ? sponsor.dealValue / 100 : "",
        status: sponsor.status,
        deliverables: sponsor.deliverables ?? "",
        notes: sponsor.notes ?? "",
      });
    } else if (mode === "create" && open) {
      reset({
        companyName: "",
        contactName: "",
        contactEmail: "",
        dealValueDollars: "",
        status: "outreach",
        deliverables: "",
        notes: "",
      });
    }
  }, [mode, sponsor, open, reset]);

  const onSubmit = (values: FormValues) => {
    const dollars =
      values.dealValueDollars === "" || values.dealValueDollars === undefined
        ? undefined
        : Number(values.dealValueDollars);
    const cents = dollars !== undefined ? Math.round(dollars * 100) : undefined;

    const payload: SponsorCreate = {
      companyName: values.companyName.trim(),
      contactName: values.contactName?.trim() || undefined,
      contactEmail: values.contactEmail?.trim() || undefined,
      dealValue: cents,
      status: values.status,
      deliverables: values.deliverables?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };

    if (mode === "create") {
      createSponsor.mutate(payload, {
        onSuccess: () => {
          toast.success("Sponsor added");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (sponsor) {
      updateSponsor.mutate(
        { id: sponsor.id, patch: payload },
        {
          onSuccess: () => {
            toast.success("Sponsor updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const isPending =
    mode === "create" ? createSponsor.isPending : updateSponsor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add sponsor" : "Edit sponsor"}
          </DialogTitle>
          <DialogDescription>
            Track sponsorship deals from outreach through completion.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sponsor-company">Company *</Label>
            <Input
              id="sponsor-company"
              {...register("companyName", {
                required: "Company name is required",
              })}
            />
            {errors.companyName && (
              <p className="text-destructive text-sm">
                {errors.companyName.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sponsor-contact-name">Contact name</Label>
              <Input id="sponsor-contact-name" {...register("contactName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-contact-email">Contact email</Label>
              <Input
                id="sponsor-contact-email"
                type="email"
                {...register("contactEmail")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sponsor-deal-value">Deal value (USD)</Label>
              <Input
                id="sponsor-deal-value"
                type="number"
                min={0}
                step="0.01"
                placeholder="1500.00"
                {...register("dealValueDollars", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-status">Status</Label>
              <select
                id="sponsor-status"
                className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                {...register("status")}
              >
                {sponsorStatusValues.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor-deliverables">Deliverables</Label>
            <Textarea
              id="sponsor-deliverables"
              rows={2}
              {...register("deliverables")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsor-notes">Notes</Label>
            <Textarea id="sponsor-notes" rows={2} {...register("notes")} />
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
                  ? "Add sponsor"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
