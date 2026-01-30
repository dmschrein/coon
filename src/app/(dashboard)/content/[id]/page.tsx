"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useContentItem, useUpdateContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: content, isLoading, error } = useContentItem(id);
  const updateContent = useUpdateContent();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [editedCta, setEditedCta] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");

  // Initialize edit state when content loads
  useState(() => {
    if (content) {
      setEditedTitle(content.title || "");
      setEditedBody(content.body || "");
      setEditedCta(content.cta || "");
      setEditedHashtags(content.hashtags?.join(", ") || "");
    }
  });

  const handleCopy = () => {
    if (!content) return;

    const fullContent = [
      content.title,
      content.body,
      content.hashtags?.map((tag) => `#${tag}`).join(" "),
      content.cta,
    ]
      .filter(Boolean)
      .join("\n\n");

    navigator.clipboard.writeText(fullContent);
    toast.success("Content copied to clipboard");
  };

  const handleSave = async () => {
    try {
      await updateContent.mutateAsync({
        id,
        title: editedTitle || undefined,
        body: editedBody,
        cta: editedCta || undefined,
        hashtags: editedHashtags
          ? editedHashtags.split(",").map((tag) => tag.trim())
          : undefined,
      });
      toast.success("Content updated successfully");
      setIsEditing(false);
    } catch (err) {
      toast.error("Failed to update content. Please try again.");
    }
  };

  const handleCancel = () => {
    if (content) {
      setEditedTitle(content.title || "");
      setEditedBody(content.body || "");
      setEditedCta(content.cta || "");
      setEditedHashtags(content.hashtags?.join(", ") || "");
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">Content not found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Content
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/content">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Content
          </Link>
        </Button>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
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
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{content.platform}</Badge>
            <Badge variant="outline">{content.contentType}</Badge>
            {content.pillar && <Badge>{content.pillar}</Badge>}
          </div>
          <CardDescription>
            Created {new Date(content.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title (optional)</label>
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Enter title..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Body</label>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  placeholder="Enter content body..."
                  rows={10}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hashtags (comma-separated)</label>
                <Input
                  value={editedHashtags}
                  onChange={(e) => setEditedHashtags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Call to Action (optional)</label>
                <Input
                  value={editedCta}
                  onChange={(e) => setEditedCta(e.target.value)}
                  placeholder="Enter CTA..."
                />
              </div>
            </>
          ) : (
            <>
              {content.title && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">Title</h3>
                  <p className="text-lg font-semibold">{content.title}</p>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Body</h3>
                <p className="whitespace-pre-wrap">{content.body}</p>
              </div>

              {content.hashtags && content.hashtags.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {content.hashtags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {content.cta && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Call to Action
                  </h3>
                  <p className="font-medium text-primary">{content.cta}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
