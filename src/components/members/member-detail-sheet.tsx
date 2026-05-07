"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, History } from "lucide-react";
import { toast } from "sonner";
import { useUpdateMember, type Member } from "@/hooks/use-members";
import {
  memberStatusValues,
  type MemberStatus,
} from "@/lib/validations/member";

interface MemberDetailSheetProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailSheet({
  member,
  open,
  onOpenChange,
}: MemberDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {member && <MemberDetailBody key={member.id} member={member} />}
      </SheetContent>
    </Sheet>
  );
}

interface MemberDetailBodyProps {
  member: Member;
}

function MemberDetailBody({ member }: MemberDetailBodyProps) {
  const updateMember = useUpdateMember();
  const [tagsInput, setTagsInput] = useState(member.tags.join(", "));
  const [notesValue, setNotesValue] = useState(member.notes ?? "");

  const handleStatusChange = (status: MemberStatus) => {
    updateMember.mutate(
      { id: member.id, patch: { status } },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleTagsBlur = () => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const current = member.tags ?? [];
    if (
      tags.length === current.length &&
      tags.every((t, i) => t === current[i])
    ) {
      return;
    }
    updateMember.mutate(
      { id: member.id, patch: { tags } },
      {
        onSuccess: () => toast.success("Tags saved"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleNotesBlur = () => {
    const next = notesValue.length > 0 ? notesValue : null;
    if (next === (member.notes ?? null)) return;
    updateMember.mutate(
      { id: member.id, patch: { notes: next } },
      {
        onSuccess: () => toast.success("Notes saved"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>@{member.username}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" />
          <span className="capitalize">{member.platform}</span>
          {member.displayName && (
            <>
              <span>&middot;</span>
              <span>{member.displayName}</span>
            </>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <section className="space-y-2">
          <Label htmlFor="member-status">Status</Label>
          <Select
            value={member.status}
            onValueChange={(v) => handleStatusChange(v as MemberStatus)}
          >
            <SelectTrigger id="member-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {memberStatusValues.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <Label htmlFor="member-tags">Tags</Label>
          <Input
            id="member-tags"
            placeholder="comma-separated, e.g. vip, beta-tester"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={handleTagsBlur}
          />
          {member.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {member.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <Label htmlFor="member-notes">Notes</Label>
          <Textarea
            id="member-notes"
            placeholder="Private notes — saved on blur"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleNotesBlur}
            rows={4}
          />
        </section>

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-semibold">Engagement History</h3>
            <Badge variant="secondary" className="ml-auto">
              {member.engagementCount}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            First seen{" "}
            {new Date(member.firstSeenAt).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}{" "}
            &middot; Last seen{" "}
            {new Date(member.lastSeenAt).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </p>
          <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
            Detailed engagement history coming soon
          </div>
        </section>
      </div>
    </>
  );
}
