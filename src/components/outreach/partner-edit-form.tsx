"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  partnerStatusValues,
  type PartnerStatus,
  type PartnerUpdate,
  type Partner,
} from "@/lib/validations/partner";
import { useDeletePartner, useUpdatePartner } from "@/hooks/use-partners";

interface PartnerEditFormProps {
  partner: Partner;
  onClose: () => void;
}

const editFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  platform: z.string().min(1, "Platform is required").max(50),
  url: z.string().max(500),
  contactHandle: z.string().max(200),
  status: z.enum(partnerStatusValues),
  collaborationIdeas: z.string().max(2000),
  notes: z.string().max(2000),
});

type FormValues = z.infer<typeof editFormSchema>;

function toFormValues(p: Partner): FormValues {
  return {
    name: p.name,
    platform: p.platform,
    url: p.url ?? "",
    contactHandle: p.contactHandle ?? "",
    status: p.status,
    collaborationIdeas: p.collaborationIdeas ?? "",
    notes: p.notes ?? "",
  };
}

function diff(values: FormValues, original: Partner): PartnerUpdate {
  const patch: PartnerUpdate = {};
  if (values.name !== original.name) patch.name = values.name;
  if (values.platform !== original.platform) patch.platform = values.platform;
  if (values.url !== (original.url ?? "")) {
    patch.url = values.url.length > 0 ? values.url : null;
  }
  if (values.contactHandle !== (original.contactHandle ?? "")) {
    patch.contactHandle =
      values.contactHandle.length > 0 ? values.contactHandle : null;
  }
  if (values.status !== original.status) patch.status = values.status;
  if (values.collaborationIdeas !== (original.collaborationIdeas ?? "")) {
    patch.collaborationIdeas =
      values.collaborationIdeas.length > 0 ? values.collaborationIdeas : null;
  }
  if (values.notes !== (original.notes ?? "")) {
    patch.notes = values.notes.length > 0 ? values.notes : null;
  }
  return patch;
}

export function PartnerEditForm({ partner, onClose }: PartnerEditFormProps) {
  const updatePartner = useUpdatePartner();
  const deletePartner = useDeletePartner();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: toFormValues(partner),
  });

  const statusValue = watch("status");

  function onSubmit(values: FormValues) {
    const patch = diff(values, partner);
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    updatePartner.mutate(
      { id: partner.id, patch },
      {
        onSuccess: () => {
          toast.success("Partner updated");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleConfirmDelete() {
    deletePartner.mutate(partner.id, {
      onSuccess: () => {
        toast.success("Partner deleted");
        setConfirmOpen(false);
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 px-4 pb-6"
      noValidate
    >
      <Field
        id="partner-name"
        label="Name"
        required
        error={errors.name?.message}
      >
        <Input id="partner-name" {...register("name")} />
      </Field>

      <Field
        id="partner-platform"
        label="Platform"
        required
        error={errors.platform?.message}
      >
        <Input
          id="partner-platform"
          placeholder="twitter, discord, reddit…"
          {...register("platform")}
        />
      </Field>

      <Field id="partner-url" label="URL" error={errors.url?.message}>
        <Input id="partner-url" placeholder="https://…" {...register("url")} />
      </Field>

      <Field
        id="partner-contact"
        label="Contact Handle"
        error={errors.contactHandle?.message}
      >
        <Input
          id="partner-contact"
          placeholder="@handle or email"
          {...register("contactHandle")}
        />
      </Field>

      <Field id="partner-status" label="Status">
        <Select
          value={statusValue}
          onValueChange={(v) =>
            setValue("status", v as PartnerStatus, { shouldDirty: true })
          }
        >
          <SelectTrigger id="partner-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {partnerStatusValues.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="partner-ideas"
        label="Collaboration Ideas"
        error={errors.collaborationIdeas?.message}
      >
        <Textarea
          id="partner-ideas"
          rows={3}
          {...register("collaborationIdeas")}
        />
      </Field>

      <Field id="partner-notes" label="Notes" error={errors.notes?.message}>
        <Textarea id="partner-notes" rows={3} {...register("notes")} />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
        >
          Delete
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updatePartner.isPending}>
            {updatePartner.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Partner</DialogTitle>
            <DialogDescription>
              Remove {partner.name} from your partner list. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletePartner.isPending}
            >
              {deletePartner.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
