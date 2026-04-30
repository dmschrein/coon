"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Copy, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDraftReply,
  useUpdateInboxStatus,
  type ReplyDraft,
  type InboxItem,
} from "@/hooks/use-inbox";

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  linkedin: 2200,
  reddit: 2200,
  threads: 500,
  tiktok: 2200,
  discord: 2000,
  youtube: 2200,
};

interface ReplyComposerProps {
  item: InboxItem;
  onReplied: () => void;
}

export function ReplyComposer({ item, onReplied }: ReplyComposerProps) {
  const [drafts, setDrafts] = useState<ReplyDraft[]>([]);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const draftReply = useDraftReply();
  const updateStatus = useUpdateInboxStatus();
  const charLimit = PLATFORM_CHAR_LIMITS[item.platform] ?? 2200;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your reply..." }),
    ],
    content: "",
    immediatelyRender: false,
  });

  const currentLength = editor?.getText().length ?? 0;
  const isOverLimit = currentLength > charLimit;

  const handleGenerateDrafts = async () => {
    try {
      const result = await draftReply.mutateAsync({
        inboxItemId: item.id,
      });
      setDrafts(result.drafts);
    } catch {
      toast.error("Failed to generate reply drafts");
    }
  };

  const handleSelectDraft = (draft: ReplyDraft) => {
    setSelectedTone(draft.tone);
    editor?.commands.setContent(draft.text);
  };

  const handleSend = async () => {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      updateStatus.mutate({ id: item.id, status: "replied" });
      toast.success("Reply copied to clipboard & marked as replied");
      onReplied();
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="space-y-3">
      {/* Generate Drafts Button */}
      {drafts.length === 0 && (
        <Button
          onClick={handleGenerateDrafts}
          disabled={draftReply.isPending}
          size="sm"
          variant="outline"
        >
          {draftReply.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating drafts...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Drafts
            </>
          )}
        </Button>
      )}

      {/* Draft Selection */}
      {drafts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Select a draft:</p>
          <div className="grid gap-2">
            {drafts.map((draft) => (
              <Card
                key={draft.tone}
                className={cn(
                  "hover:bg-accent cursor-pointer transition-colors",
                  selectedTone === draft.tone && "border-primary bg-accent"
                )}
                onClick={() => handleSelectDraft(draft)}
              >
                <CardContent className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {draft.tone}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {draft.text.length}/{charLimit}
                    </span>
                  </div>
                  <p className="text-sm">{draft.text}</p>
                  <p className="text-muted-foreground mt-1 text-xs italic">
                    {draft.rationale}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="prose prose-sm min-h-[100px] max-w-none rounded-md border p-3">
        <EditorContent editor={editor} />
      </div>

      {/* Character counter + actions */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs",
            isOverLimit
              ? "text-destructive font-medium"
              : "text-muted-foreground"
          )}
        >
          {currentLength}/{charLimit}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (editor) {
                navigator.clipboard.writeText(editor.getText());
                toast.success("Copied to clipboard");
              }
            }}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isOverLimit || updateStatus.isPending || !currentLength}
          >
            {updateStatus.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
