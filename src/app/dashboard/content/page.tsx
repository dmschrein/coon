"use client";

import { useState } from "react";
import { useContentList, useGenerateContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentCard } from "@/components/content/content-card";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = [
  { value: "all", label: "All Platforms" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "reddit", label: "Reddit" },
  { value: "discord", label: "Discord" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "threads", label: "Threads" },
];

export default function ContentPage() {
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const filters = platformFilter === "all" ? undefined : { platform: platformFilter };
  const { data: content, isLoading, error } = useContentList(filters);
  const generateContent = useGenerateContent();

  const handleGenerate = async () => {
    try {
      await generateContent.mutateAsync();
      toast.success("Content generated successfully");
    } catch (err) {
      toast.error("Failed to generate content. Please try again.");
    }
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

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">Failed to load content</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!content || content.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-muted-foreground">
            AI-generated content for your audience
          </p>
        </div>

        <div className="flex min-h-[400px] items-center justify-center">
          <div className="max-w-md text-center">
            <Sparkles className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">No Content Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate your first batch of content based on your audience profile. Our AI will
              create tailored content for your selected platforms.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generateContent.isPending}
              className="mt-6"
              size="lg"
            >
              {generateContent.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-muted-foreground">
            {content.length} content {content.length === 1 ? "item" : "items"} generated
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateContent.isPending}
        >
          {generateContent.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate More
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map((platform) => (
              <SelectItem key={platform.value} value={platform.value}>
                {platform.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {content.map((item) => (
          <ContentCard key={item.id} {...item} />
        ))}
      </div>
    </div>
  );
}
