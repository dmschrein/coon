"use client";

import type { CampaignPlatform, MediaAsset } from "@/types";
import {
  InstagramPreview,
  TwitterPreview,
  RedditPreview,
  TikTokPreview,
  YouTubePreview,
  LinkedInPreview,
  PinterestPreview,
  ThreadsPreview,
} from "./previews";

interface PlatformPreviewProps {
  platform: CampaignPlatform;
  title: string | null;
  body: string | null;
  contentData: unknown;
  media: MediaAsset[];
}

export function PlatformPreview({
  platform,
  title,
  body,
  contentData,
  media,
}: PlatformPreviewProps) {
  const commonProps = { title, body, contentData };
  const mediaProps = { ...commonProps, media };

  switch (platform) {
    case "instagram":
      return <InstagramPreview {...mediaProps} />;
    case "twitter":
      return <TwitterPreview {...commonProps} />;
    case "reddit":
      return <RedditPreview {...commonProps} />;
    case "tiktok":
      return <TikTokPreview {...mediaProps} />;
    case "youtube":
      return <YouTubePreview {...mediaProps} />;
    case "linkedin":
      return <LinkedInPreview {...commonProps} />;
    case "pinterest":
      return <PinterestPreview {...mediaProps} />;
    case "threads":
      return <ThreadsPreview {...commonProps} />;
    default:
      return (
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Preview not available for {platform}
        </div>
      );
  }
}
