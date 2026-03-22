"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useContentList, useGenerateContent } from "@/hooks/use-content";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentCard } from "@/components/content/content-card";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
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

const CONTENT_GENERATION_STEPS = [
  "Analyzing your audience...",
  "Developing content strategy...",
  "Writing content drafts...",
  "Tailoring per platform...",
  "Finalizing your content...",
];

function GenerationProgress({ isGenerating }: { isGenerating: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isGenerating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    stepIntervalRef.current = setInterval(() => {
      setStepIndex((i) =>
        i < CONTENT_GENERATION_STEPS.length - 1 ? i + 1 : i
      );
    }, 24000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, [isGenerating]);

  if (!isGenerating) return null;

  const progressPct = Math.min(
    (stepIndex / (CONTENT_GENERATION_STEPS.length - 1)) * 90,
    90
  );

  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center">
        <Sparkles className="text-primary mx-auto h-12 w-12 animate-pulse" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Creating Your Content</h2>
          <p className="text-muted-foreground text-sm">
            {CONTENT_GENERATION_STEPS[stepIndex]}
          </p>
        </div>
        <div className="space-y-2">
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-3000 ease-in-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">{elapsed}s elapsed</p>
        </div>
      </div>
    </div>
  );
}

export default function ContentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const filters =
    platformFilter === "all" ? undefined : { platform: platformFilter };
  const { data: content, isLoading, error } = useContentList(filters);
  const generateContent = useGenerateContent();
  const autoGenerateFired = useRef(false);

  // Auto-trigger when arriving from audience page
  useEffect(() => {
    if (
      searchParams.get("autoGenerate") === "true" &&
      !isLoading &&
      (!content || content.length === 0) &&
      !autoGenerateFired.current &&
      !generateContent.isPending
    ) {
      autoGenerateFired.current = true;
      generateContent.mutate(undefined, {
        onError: () =>
          toast.error("Failed to generate content. Please try again."),
      });
    }
  }, [searchParams, isLoading, content, generateContent]);

  const handleGenerate = async () => {
    try {
      await generateContent.mutateAsync();
      toast.success("Content generated successfully");
    } catch {
      toast.error("Failed to generate content. Please try again.");
    }
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

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-sm">Failed to load content</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (generateContent.isPending) {
    return <GenerationProgress isGenerating />;
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
            <Sparkles className="text-primary mx-auto h-12 w-12" />
            <h2 className="mt-4 text-xl font-semibold">No Content Yet</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Generate your first batch of content based on your audience
              profile. Our AI will create tailored posts for your platforms.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generateContent.isPending}
              className="mt-6"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Content
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
            {content.length} content {content.length === 1 ? "item" : "items"}{" "}
            generated
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateContent.isPending}
          variant="outline"
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

      {/* Campaign CTA */}
      <div className="bg-muted/40 flex items-center justify-between gap-4 rounded-lg border p-6">
        <div>
          <p className="font-semibold">Ready to plan your launch?</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a campaign to schedule your content across platforms and
            build a posting calendar.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/campaign")}
        >
          Create a Campaign
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
