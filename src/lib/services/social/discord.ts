/**
 * Discord Platform Adapter - Bot Token posting via Discord REST API.
 *
 * Unlike other adapters, Discord uses a long-lived Bot Token (no OAuth redirect).
 * The token is collected by POST /api/accounts/connect/discord, not via getAuthUrl.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import { AuthExpiredError, RateLimitError, NotImplementedError } from "./types";

const DISCORD_API = "https://discord.com/api/v10";
const MAX_MESSAGE_LENGTH = 2000;

interface DiscordReaction {
  count: number;
}

interface DiscordMessage {
  id: string;
  guild_id?: string;
  reactions?: DiscordReaction[];
  thread?: { message_count?: number };
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

export class DiscordAdapter implements SocialPlatformAdapter {
  platform = "discord" as const;

  getAuthUrl(): string {
    throw new NotImplementedError("discord", "getAuthUrl");
  }

  async exchangeCode(): Promise<never> {
    throw new NotImplementedError("discord", "exchangeCode");
  }

  async getAccountInfo(botToken: string) {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (res.status === 401) {
      throw new AuthExpiredError("Invalid Discord bot token");
    }
    if (res.status === 429) {
      throw new RateLimitError();
    }
    if (!res.ok) {
      throw new Error(`Discord account info failed: ${res.status}`);
    }

    const user = (await res.json()) as DiscordUser;
    return {
      accountId: user.id,
      accountName: user.username,
      profileImageUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : undefined,
    };
  }

  async post(botToken: string, payload: PostPayload): Promise<PostResult> {
    if (payload.body.length >= MAX_MESSAGE_LENGTH) {
      throw new Error(
        `Discord message exceeds ${MAX_MESSAGE_LENGTH} character limit`
      );
    }
    const channelId = payload.communityTarget;
    if (!channelId) {
      throw new Error("Discord post requires communityTarget (channel ID)");
    }

    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: payload.body }),
    });

    if (res.status === 401) throw new AuthExpiredError();
    if (res.status === 429) throw new RateLimitError();
    if (!res.ok) {
      throw new Error(`Discord post failed: ${res.status}`);
    }

    const msg = (await res.json()) as DiscordMessage;
    const guildSegment = msg.guild_id ?? "@me";
    // Composite id `channelId:messageId` so fetchEngagement can locate the message later.
    return {
      externalPostId: `${channelId}:${msg.id}`,
      externalPostUrl: `https://discord.com/channels/${guildSegment}/${channelId}/${msg.id}`,
    };
  }

  async fetchEngagement(
    postId: string,
    botToken: string
  ): Promise<PlatformEngagement | null> {
    const [channelId, messageId] = postId.split(":");
    if (!channelId || !messageId) return null;

    const res = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages/${messageId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (res.status === 401) throw new AuthExpiredError();
    if (res.status === 429) throw new RateLimitError();
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Discord engagement fetch failed: ${res.status}`);
    }

    const msg = (await res.json()) as DiscordMessage;
    const likes = (msg.reactions ?? []).reduce(
      (sum, r) => sum + (r.count ?? 0),
      0
    );
    const comments = msg.thread?.message_count ?? 0;

    return {
      likes,
      comments,
      shares: 0,
      reach: 0,
      impressions: 0,
      engagementRate: null,
      recordedAt: new Date(),
    };
  }
}
