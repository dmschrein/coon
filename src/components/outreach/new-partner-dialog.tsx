"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  partnerCreateSchema,
  type PartnerCreate,
} from "@/lib/validations/partner";
import { useCreatePartner } from "@/hooks/use-partners";

interface NewPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPartnerDialog({
  open,
  onOpenChange,
}: NewPartnerDialogProps) {
  const createPartner = useCreatePartner();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartnerCreate>({
    resolver: zodResolver(partnerCreateSchema),
    defaultValues: { name: "", platform: "" },
  });

  function onSubmit(values: PartnerCreate) {
    const trimmed: PartnerCreate = {
      name: values.name.trim(),
      platform: values.platform.trim(),
      url: values.url?.trim() || undefined,
      contactHandle: values.contactHandle?.trim() || undefined,
      collaborationIdeas: values.collaborationIdeas?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };
    createPartner.mutate(trimmed, {
      onSuccess: () => {
        toast.success("Partner added");
        reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Partner</DialogTitle>
          <DialogDescription>
            Track a new community partner for cross-promo and collabs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-partner-name">Name *</Label>
            <Input id="new-partner-name" {...register("name")} />
            {errors.name ? (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-partner-platform">Platform *</Label>
            <Input
              id="new-partner-platform"
              placeholder="twitter, discord, reddit…"
              {...register("platform")}
            />
            {errors.platform ? (
              <p className="text-destructive text-sm">
                {errors.platform.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-partner-url">URL</Label>
            <Input id="new-partner-url" {...register("url")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-partner-contact">Contact Handle</Label>
            <Input id="new-partner-contact" {...register("contactHandle")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-partner-ideas">Collaboration Ideas</Label>
            <Textarea
              id="new-partner-ideas"
              rows={2}
              {...register("collaborationIdeas")}
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
            <Button type="submit" disabled={createPartner.isPending}>
              {createPartner.isPending ? "Adding…" : "Add Partner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
