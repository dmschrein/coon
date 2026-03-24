"use client";

import { use, useState } from "react";
import { useCampaign } from "@/hooks/use-campaign";
import { usePublishContent } from "@/hooks/use-publish";
import { ConnectedAccountsBar } from "@/components/publish/connected-accounts-bar";
import { ScheduleTimeline } from "@/components/publish/schedule-timeline";
import { StatusFeed } from "@/components/publish/status-feed";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { SocialPlatform, PublishResult, CampaignPlatform } from "@/types";

const SUPPORTED_SOCIAL: SocialPlatform[] = [
  "reddit",
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "threads",
  "linkedin",
];

export default function PublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useCampaign(id);
  const publishContent = usePublishContent(id);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);

  const handlePublish = async (contentId: string) => {
    setPublishingId(contentId);
    try {
      const result = await publishContent.mutateAsync(contentId);
      setPublishResults((prev) => [result, ...prev]);
      if (result.status === "published") {
        toast.success("Content published successfully!");
      } else {
        toast.error(result.error ?? "Publish failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      toast.error(message);
      setPublishResults((prev) => [
        { contentId, status: "failed", error: message },
        ...prev,
      ]);
    } finally {
      setPublishingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-destructive text-sm">Failed to load campaign</p>
      </div>
    );
  }

  const { campaign, content } = data;

  // Filter platforms that are in the campaign and supported for social
  const campaignPlatforms = (campaign.selectedPlatforms ?? []).filter(
    (p: CampaignPlatform) => SUPPORTED_SOCIAL.includes(p as SocialPlatform)
  ) as SocialPlatform[];

  // Map content items with extra fields for the timeline
  const contentItems = content
    .filter((c: { status: string }) => c.status === "complete")
    .map(
      (c: {
        id: string;
        platform: CampaignPlatform;
        title?: string;
        pillar?: string;
        body?: string;
        scheduledFor?: string;
        approvalStatus: string;
        externalPostUrl?: string;
        postedAt?: string;
      }) => ({
        id: c.id,
        platform: c.platform,
        title: c.title ?? null,
        pillar: c.pillar ?? null,
        body: c.body ?? null,
        scheduledFor: c.scheduledFor ? new Date(c.scheduledFor) : null,
        approvalStatus:
          c.approvalStatus as import("@/types").ContentApprovalStatus,
        externalPostUrl: c.externalPostUrl ?? null,
        postedAt: c.postedAt ? new Date(c.postedAt) : null,
      })
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/campaign/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Publish — {campaign.name ?? "Campaign"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Connect accounts and publish approved content
          </p>
        </div>
      </div>

      <ConnectedAccountsBar requiredPlatforms={campaignPlatforms} />

      <StatusFeed results={publishResults} />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Ready to Publish</h2>
        <ScheduleTimeline
          items={contentItems}
          publishingId={publishingId}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
