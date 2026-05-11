"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProspect } from "@/hooks/use-prospects";

const platformOptions = [
  "twitter",
  "instagram",
  "tiktok",
  "threads",
  "youtube",
  "reddit",
  "linkedin",
  "discord",
] as const;

const formSchema = z.object({
  handle: z.string().min(1, "Handle is required").max(200),
  platform: z.enum(platformOptions, { message: "Platform is required" }),
  tags: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProspectDialog({
  open,
  onOpenChange,
}: NewProspectDialogProps) {
  const createProspect = useCreateProspect();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { handle: "", platform: "twitter", tags: "", notes: "" },
  });

  const platformValue = watch("platform");

  function onSubmit(values: FormValues) {
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    createProspect.mutate(
      {
        handle: values.handle.trim(),
        platform: values.platform,
        source: "manual",
        notes: values.notes?.trim() || undefined,
        tags,
      },
      {
        onSuccess: () => {
          toast.success("Prospect created");
          reset();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
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
          <DialogTitle>New Prospect</DialogTitle>
          <DialogDescription>
            Add a single prospect to your outreach list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              placeholder="@username"
              {...register("handle")}
            />
            {errors.handle ? (
              <p className="text-destructive text-sm">
                {errors.handle.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select
              value={platformValue}
              onValueChange={(v) =>
                setValue("platform", v as FormValues["platform"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platformOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.platform ? (
              <p className="text-destructive text-sm">
                {errors.platform.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="vip, reply-fast"
              {...register("tags")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Optional context"
              {...register("notes")}
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
            <Button type="submit" disabled={createProspect.isPending}>
              {createProspect.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
