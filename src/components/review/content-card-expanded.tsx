"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContentApprovalStatus, CampaignPlatform } from "@/types";

interface ContentCardExpandedProps {
  open: boolean;
  onClose: () => void;
  id: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  body: string | null;
  approvalStatus: ContentApprovalStatus;
  scheduledFor: Date | null;
  onApprovalChange: (id: string, status: ContentApprovalStatus) => void;
  onBodyUpdate: (id: string, body: string) => void;
}

export function ContentCardExpanded({
  open,
  onClose,
  id,
  platform,
  title,
  pillar,
  body,
  approvalStatus,
  scheduledFor,
  onApprovalChange,
  onBodyUpdate,
}: ContentCardExpandedProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your content here..." }),
    ],
    content: body ?? "",
    onUpdate: () => setHasChanges(true),
  });

  const handleSave = () => {
    if (editor) {
      onBodyUpdate(id, editor.getHTML());
      setHasChanges(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[500px] overflow-y-auto sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{title ?? "Untitled content"}</SheetTitle>
          <div className="flex gap-2 pt-1">
            <Badge variant="outline">{platform}</Badge>
            {pillar && <Badge variant="secondary">{pillar}</Badge>}
          </div>
          {scheduledFor && (
            <p className="text-muted-foreground text-xs">
              Scheduled: {new Date(scheduledFor).toLocaleDateString()}
            </p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="prose prose-sm min-h-[200px] max-w-none rounded-md border p-3">
            <EditorContent editor={editor} />
          </div>

          {hasChanges && (
            <Button onClick={handleSave} size="sm">
              Save changes
            </Button>
          )}

          <div className="flex gap-2 border-t pt-4">
            <Button
              size="sm"
              variant={approvalStatus === "approved" ? "default" : "outline"}
              onClick={() => onApprovalChange(id, "approved")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant={
                approvalStatus === "needs_revision" ? "default" : "outline"
              }
              onClick={() => onApprovalChange(id, "needs_revision")}
            >
              Needs Revision
            </Button>
            <Button
              size="sm"
              variant={
                approvalStatus === "rejected" ? "destructive" : "outline"
              }
              onClick={() => onApprovalChange(id, "rejected")}
            >
              Reject
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
