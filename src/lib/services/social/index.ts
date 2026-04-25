/**
 * Social Platform Adapters - Registry of platform-specific adapters.
 *
 * In development, if real credentials are not set, mock adapters are used
 * so the full OAuth flow can be tested locally.
 */

export type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
export { AuthExpiredError, RateLimitError, NotImplementedError } from "./types";
export { RedditAdapter } from "./reddit";
export { InstagramAdapter } from "./instagram";
export { TwitterAdapter } from "./twitter";
export { LinkedInAdapter } from "./linkedin";
export { TikTokAdapter } from "./tiktok";
export { YouTubeAdapter } from "./youtube";
export { ThreadsAdapter } from "./threads";
export { MockAdapter } from "./mock";

import type { SocialPlatformAdapter } from "./types";
import type { SocialPlatform } from "@/types";
import { RedditAdapter } from "./reddit";
import { InstagramAdapter } from "./instagram";
import { TwitterAdapter } from "./twitter";
import { LinkedInAdapter } from "./linkedin";
import { TikTokAdapter } from "./tiktok";
import { YouTubeAdapter } from "./youtube";
import { ThreadsAdapter } from "./threads";
import { MockAdapter } from "./mock";

function createAdapters(): Partial<
  Record<SocialPlatform, SocialPlatformAdapter>
> {
  const isDev = process.env.NODE_ENV === "development";
  const hasRedditCreds = !!process.env.REDDIT_CLIENT_ID;
  const hasInstagramCreds = !!process.env.INSTAGRAM_APP_ID;

  return {
    reddit: hasRedditCreds
      ? new RedditAdapter()
      : isDev
        ? new MockAdapter("reddit")
        : undefined,
    instagram: hasInstagramCreds
      ? new InstagramAdapter()
      : isDev
        ? new MockAdapter("instagram")
        : undefined,
    twitter: isDev ? new MockAdapter("twitter") : new TwitterAdapter(),
    linkedin: isDev ? new MockAdapter("linkedin") : new LinkedInAdapter(),
    tiktok: isDev ? new MockAdapter("tiktok") : new TikTokAdapter(),
    youtube: isDev ? new MockAdapter("youtube") : new YouTubeAdapter(),
    threads: isDev ? new MockAdapter("threads") : new ThreadsAdapter(),
  };
}

const adapters = createAdapters();

export function getAdapter(
  platform: SocialPlatform
): SocialPlatformAdapter | null {
  return adapters[platform] ?? null;
}

export function getPlatformService(
  platform: SocialPlatform
): SocialPlatformAdapter | null {
  return getAdapter(platform);
}
