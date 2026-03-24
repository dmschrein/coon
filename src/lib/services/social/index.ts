/**
 * Social Platform Adapters - Registry of platform-specific adapters.
 */

export type { SocialPlatformAdapter, PostPayload, PostResult } from "./types";
export { RedditAdapter } from "./reddit";
export { InstagramAdapter } from "./instagram";

import type { SocialPlatformAdapter } from "./types";
import type { SocialPlatform } from "@/types";
import { RedditAdapter } from "./reddit";
import { InstagramAdapter } from "./instagram";

const adapters: Partial<Record<SocialPlatform, SocialPlatformAdapter>> = {
  reddit: new RedditAdapter(),
  instagram: new InstagramAdapter(),
};

export function getAdapter(
  platform: SocialPlatform
): SocialPlatformAdapter | null {
  return adapters[platform] ?? null;
}
