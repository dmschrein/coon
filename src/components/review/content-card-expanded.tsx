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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { HashtagInput } from "./hashtag-input";
import { useGenerateContentMedia } from "@/hooks/use-media";
import {
  Camera,
  Loader2,
  Eye,
  Pencil,
  RefreshCw,
  Trash2,
  CalendarClock,
} from "lucide-react";
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
  hashtags?: string[];
  targetCommunity?: string | null;
  contentType?: string | null;
  aiConfidenceScore?: number | null;
  onApprovalChange: (id: string, status: ContentApprovalStatus) => void;
  onBodyUpdate: (id: string, body: string) => void;
  onHashtagsUpdate: (id: string, hashtags: string[]) => void;
  onTargetCommunityUpdate: (id: string, community: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
  onSchedule: (id: string) => void;
  isRegenerating?: boolean;
}

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-100 text-green-800"
      : score >= 50
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <Badge className={color} variant="secondary">
      {score}% confidence
    </Badge>
  );
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
  hashtags = [],
  targetCommunity,
  contentType,
  aiConfidenceScore,
  onApprovalChange,
  onBodyUpdate,
  onHashtagsUpdate,
  onTargetCommunityUpdate,
  onRegenerate,
  onDelete,
  onSchedule,
  isRegenerating,
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

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this content?")) {
      onDelete(id);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[500px] overflow-y-auto sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{title ?? "Untitled content"}</SheetTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">{platform}</Badge>
            {contentType && (
              <Badge variant="secondary" className="capitalize">
                {contentType}
              </Badge>
            )}
            {pillar && <Badge variant="secondary">{pillar}</Badge>}
            {aiConfidenceScore != null && (
              <ConfidenceBadge score={aiConfidenceScore} />
            )}
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

              {/* Hashtag editing */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hashtags</Label>
                <HashtagInput
                  hashtags={hashtags}
                  onChange={(tags) => onHashtagsUpdate(id, tags)}
                />
              </div>

              {/* Target community for Reddit */}
              {platform === "reddit" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Target Subreddit
                  </Label>
                  <Input
                    placeholder="e.g., r/startups"
                    defaultValue={targetCommunity ?? ""}
                    onBlur={(e) => onTargetCommunityUpdate(id, e.target.value)}
                  />
                </div>
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

          {/* Actions */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onApprovalChange(id, "approved")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={() => onApprovalChange(id, "needs_revision")}
              >
                Request Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSchedule.bind(null, id)}
              >
                <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                Schedule
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRegenerate(id)}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Regenerate
              </Button>
              <button
                type="button"
                className="ml-auto flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
