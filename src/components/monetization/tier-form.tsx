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
  billingCycleValues,
  type MembershipTier,
  type TierCreate,
} from "@/lib/validations/tier";
import { useCreateTier, useUpdateTier } from "@/hooks/use-tiers";

interface FormValues {
  name: string;
  tagline?: string;
  description?: string;
  priceDollars?: number | "";
  billingCycle: (typeof billingCycleValues)[number];
  benefitsText?: string;
  externalPaymentUrl?: string;
}

interface TierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  tier?: MembershipTier | null;
}

export function TierForm({ open, onOpenChange, mode, tier }: TierFormProps) {
  const createTier = useCreateTier();
  const updateTier = useUpdateTier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      priceDollars: "",
      billingCycle: "monthly",
      benefitsText: "",
      externalPaymentUrl: "",
    },
  });

  useEffect(() => {
    if (mode === "edit" && tier) {
      reset({
        name: tier.name,
        tagline: tier.tagline ?? "",
        description: tier.description ?? "",
        priceDollars: tier.priceCents / 100,
        billingCycle: tier.billingCycle,
        benefitsText: tier.benefits.join("\n"),
        externalPaymentUrl: tier.externalPaymentUrl ?? "",
      });
    } else if (mode === "create" && open) {
      reset({
        name: "",
        tagline: "",
        description: "",
        priceDollars: "",
        billingCycle: "monthly",
        benefitsText: "",
        externalPaymentUrl: "",
      });
    }
  }, [mode, tier, open, reset]);

  const onSubmit = (values: FormValues) => {
    const dollars =
      values.priceDollars === "" || values.priceDollars === undefined
        ? 0
        : Number(values.priceDollars);
    const cents = Math.round(dollars * 100);

    const benefits =
      values.benefitsText
        ?.split("\n")
        .map((b) => b.trim())
        .filter(Boolean) ?? [];

    const payload: TierCreate = {
      name: values.name.trim(),
      tagline: values.tagline?.trim() || undefined,
      description: values.description?.trim() || undefined,
      priceCents: cents,
      billingCycle: values.billingCycle,
      benefits,
      externalPaymentUrl: values.externalPaymentUrl?.trim() || undefined,
    };

    if (mode === "create") {
      createTier.mutate(payload, {
        onSuccess: () => {
          toast.success("Tier added");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (tier) {
      updateTier.mutate(
        { id: tier.id, patch: payload },
        {
          onSuccess: () => {
            toast.success("Tier updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const isPending =
    mode === "create" ? createTier.isPending : updateTier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add tier" : "Edit tier"}
          </DialogTitle>
          <DialogDescription>
            Configure pricing, billing cycle, and benefits for this membership
            tier.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tier-name">Name *</Label>
            <Input
              id="tier-name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier-tagline">Tagline</Label>
            <Input id="tier-tagline" {...register("tagline")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier-description">Description</Label>
            <Textarea
              id="tier-description"
              rows={2}
              {...register("description")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tier-price">Price (USD)</Label>
              <Input
                id="tier-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="29.00"
                {...register("priceDollars", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-cycle">Billing cycle</Label>
              <select
                id="tier-cycle"
                className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                {...register("billingCycle")}
              >
                {billingCycleValues.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier-benefits">Benefits (one per line)</Label>
            <Textarea
              id="tier-benefits"
              rows={5}
              placeholder={"Launch your first ...\nMaster the ...\nBuild a ..."}
              {...register("benefitsText")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier-payment-url">External payment URL</Label>
            <Input
              id="tier-payment-url"
              type="url"
              placeholder="https://stripe.com/..."
              {...register("externalPaymentUrl")}
            />
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
                  ? "Add tier"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
