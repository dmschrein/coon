"use client";

import { useParams, useRouter } from "next/navigation";
import { useContentItem, useUpdateContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: content, isLoading, error } = useContentItem(id);
  const updateContent = useUpdateContent();

  // Derive initial form values from content; user edits tracked separately
  const contentDefaults = useMemo(
    () => ({
      title: content?.title || "",
      body: content?.body || "",
      hashtags: content?.hashtags?.join(", ") || "",
      cta: content?.cta || "",
    }),
    [content]
  );

  const [titleOverride, setTitle] = useState<string | null>(null);
  const [bodyOverride, setBody] = useState<string | null>(null);
  const [hashtagsOverride, setHashtags] = useState<string | null>(null);
  const [ctaOverride, setCta] = useState<string | null>(null);

  const title = titleOverride ?? contentDefaults.title;
  const body = bodyOverride ?? contentDefaults.body;
  const hashtags = hashtagsOverride ?? contentDefaults.hashtags;
  const cta = ctaOverride ?? contentDefaults.cta;

  const handleSave = async () => {
    try {
      await updateContent.mutateAsync({
        id,
        title: title || undefined,
        body,
        hashtags: hashtags
          ? hashtags.split(",").map((tag) => tag.trim())
          : undefined,
        cta: cta || undefined,
      });
      toast.success("Content updated successfully");
    } catch {
      toast.error("Failed to update content");
    }
  };

  const handleCopy = () => {
    const fullContent = [
      title,
      body,
      hashtags
        ?.split(",")
        .map((tag) => `#${tag.trim()}`)
        .join(" "),
      cta,
    ]
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(fullContent);
    toast.success("Content copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4 text-sm">
            Loading content...
          </p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-sm">Failed to load content</p>
          <Button
            onClick={() => router.back()}
            className="mt-4"
            variant="outline"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Content Details</h1>
            <p className="text-muted-foreground">
              Created {new Date(content.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button onClick={handleSave} disabled={updateContent.isPending}>
            {updateContent.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{content.platform}</Badge>
            <Badge variant="outline">{content.contentType}</Badge>
            {content.pillar && <Badge>{content.pillar}</Badge>}
            {content.status && (
              <Badge variant="default">{content.status}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title / Headline</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional title or headline"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Content body"
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="Comma-separated hashtags (without #)"
            />
            <p className="text-muted-foreground text-xs">
              Example: tech, ai, startup
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta">Call to Action</Label>
            <Input
              id="cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Optional call to action"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
