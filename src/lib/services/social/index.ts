/**
 * Social Platform Adapters - Registry of platform-specific adapters.
 *
 * In development, if real credentials are not set, mock adapters are used
 * so the full OAuth flow can be tested locally.
 */

export type { SocialPlatformAdapter, PostPayload, PostResult } from "./types";
export { RedditAdapter } from "./reddit";
export { InstagramAdapter } from "./instagram";
export { MockAdapter } from "./mock";

import type { SocialPlatformAdapter } from "./types";
import type { SocialPlatform } from "@/types";
import { RedditAdapter } from "./reddit";
import { InstagramAdapter } from "./instagram";
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
  };
}

const adapters = createAdapters();

export function getAdapter(
  platform: SocialPlatform
): SocialPlatformAdapter | null {
  return adapters[platform] ?? null;
}
