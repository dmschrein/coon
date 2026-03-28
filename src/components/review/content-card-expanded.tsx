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
import type {
  ContentApprovalStatus,
  CampaignPlatform,
  ContentEnrichments,
} from "@/types";
import { MediaGallery } from "./media-gallery";
import { ScoreDetail } from "./score-detail";
import { HashtagOptimizer } from "./hashtag-optimizer";
import { SeoPanel } from "./seo-panel";
import { PostingTimeCard } from "./posting-time-card";
import { PlatformPreview } from "./platform-preview";
import { useGenerateContentMedia } from "@/hooks/use-media";
import { Camera, Loader2, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

interface ContentCardExpandedProps {
  open: boolean;
  onClose: () => void;
  id: string;
  campaignId: string;
  platform: CampaignPlatform;
  title: string | null;
  pillar: string | null;
  body: string | null;
  contentData: unknown;
  approvalStatus: ContentApprovalStatus;
  scheduledFor: Date | null;
  enrichments: ContentEnrichments | null;
  onApprovalChange: (id: string, status: ContentApprovalStatus) => void;
  onBodyUpdate: (id: string, body: string) => void;
}

export function ContentCardExpanded({
  open,
  onClose,
  id,
  campaignId,
  platform,
  title,
  pillar,
  body,
  contentData,
  approvalStatus,
  scheduledFor,
  enrichments,
  onApprovalChange,
  onBodyUpdate,
}: ContentCardExpandedProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const generateMedia = useGenerateContentMedia(campaignId, id);
  const mediaAssets = enrichments?.media?.assets ?? [];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your content here..." }),
    ],
    content: body ?? "",
    immediatelyRender: false,
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
          {/* Edit / Preview Toggle */}
          <div className="flex gap-1 rounded-lg border p-1">
            <Button
              size="sm"
              variant={activeTab === "edit" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => setActiveTab("edit")}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant={activeTab === "preview" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => setActiveTab("preview")}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Preview
            </Button>
          </div>

          {activeTab === "edit" ? (
            <>
              <div className="prose prose-sm min-h-[200px] max-w-none rounded-md border p-3">
                <EditorContent editor={editor} />
              </div>

              {hasChanges && (
                <Button onClick={handleSave} size="sm">
                  Save changes
                </Button>
              )}
            </>
          ) : (
            <div className="rounded-lg border bg-gray-50 p-4">
              <PlatformPreview
                platform={platform}
                title={title}
                body={body}
                contentData={contentData}
                media={mediaAssets}
              />
            </div>
          )}

          {/* Media Gallery */}
          {mediaAssets.length > 0 ? (
            <div className="border-t pt-4">
              <MediaGallery assets={mediaAssets} platform={platform} />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await generateMedia.mutateAsync();
                  toast.success("Media generated!");
                } catch {
                  toast.error("Failed to generate media");
                }
              }}
              disabled={generateMedia.isPending}
            >
              {generateMedia.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Generate Images
                </>
              )}
            </Button>
          )}

          {/* Score Detail */}
          {enrichments?.scores && (
            <div className="border-t pt-4">
              <ScoreDetail scores={enrichments.scores} />
            </div>
          )}

          {/* SEO Optimization */}
          {enrichments?.seoData && (
            <div className="space-y-4 border-t pt-4">
              {enrichments.seoData.hashtags && (
                <HashtagOptimizer hashtags={enrichments.seoData.hashtags} />
              )}
              {enrichments.seoData.seo && (
                <SeoPanel seo={enrichments.seoData.seo} />
              )}
              {enrichments.seoData.postingTime && (
                <PostingTimeCard
                  postingTime={enrichments.seoData.postingTime}
                />
              )}
            </div>
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
