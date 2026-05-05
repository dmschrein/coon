import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscordAdapter } from "../discord";
import {
  AuthExpiredError,
  RateLimitError,
  NotImplementedError,
} from "../types";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

describe("DiscordAdapter.getAccountInfo", () => {
  const adapter = new DiscordAdapter();
  const botToken = "MTIzNDU2Nzg5MDEyMzQ1Njc4.example_bot_token";

  it("returns account info from Discord users/@me", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: "111222333444555666",
          username: "MyBot",
          avatar: "abc123",
        }),
    });

    const info = await adapter.getAccountInfo(botToken);

    expect(info).toEqual({
      accountId: "111222333444555666",
      accountName: "MyBot",
      profileImageUrl:
        "https://cdn.discordapp.com/avatars/111222333444555666/abc123.png",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/users/@me",
      { headers: { Authorization: `Bot ${botToken}` } }
    );
  });

  it("omits profileImageUrl when avatar is null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ id: "1", username: "NoAvatar", avatar: null }),
    });

    const info = await adapter.getAccountInfo(botToken);
    expect(info.profileImageUrl).toBeUndefined();
  });

  it("throws AuthExpiredError on 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(adapter.getAccountInfo(botToken)).rejects.toThrow(
      AuthExpiredError
    );
  });

  it("throws RateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(adapter.getAccountInfo(botToken)).rejects.toThrow(
      RateLimitError
    );
  });

  it("throws generic error on 500", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(adapter.getAccountInfo(botToken)).rejects.toThrow(
      "Discord account info failed: 500"
    );
  });
});

describe("DiscordAdapter.post", () => {
  const adapter = new DiscordAdapter();
  const botToken = "bot_token_long_enough_for_test";
  const channelId = "888777666555444333";

  it("posts to /channels/{id}/messages with bot auth and json body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: "999000111222333444",
          guild_id: "555444333222111000",
        }),
    });

    const result = await adapter.post(botToken, {
      body: "hello world",
      communityTarget: channelId,
    });

    expect(result).toEqual({
      externalPostId: `${channelId}:999000111222333444`,
      externalPostUrl:
        "https://discord.com/channels/555444333222111000/888777666555444333/999000111222333444",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: "hello world" }),
      }
    );
  });

  it("falls back to @me when guild_id is absent (DM)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "msg-1" }),
    });

    const result = await adapter.post(botToken, {
      body: "hi",
      communityTarget: channelId,
    });

    expect(result.externalPostUrl).toBe(
      `https://discord.com/channels/@me/${channelId}/msg-1`
    );
  });

  it("rejects message at exactly 2000 chars", async () => {
    const body = "a".repeat(2000);
    await expect(
      adapter.post(botToken, { body, communityTarget: channelId })
    ).rejects.toThrow(/2000 character limit/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts message at 1999 chars", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "msg-1", guild_id: "g-1" }),
    });
    const body = "a".repeat(1999);
    await expect(
      adapter.post(botToken, { body, communityTarget: channelId })
    ).resolves.toBeDefined();
  });

  it("throws when communityTarget is missing", async () => {
    await expect(adapter.post(botToken, { body: "hi" })).rejects.toThrow(
      /channel ID/
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws AuthExpiredError on 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(
      adapter.post(botToken, { body: "hi", communityTarget: channelId })
    ).rejects.toThrow(AuthExpiredError);
  });

  it("throws RateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(
      adapter.post(botToken, { body: "hi", communityTarget: channelId })
    ).rejects.toThrow(RateLimitError);
  });

  it("throws generic error on other failures", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(
      adapter.post(botToken, { body: "hi", communityTarget: channelId })
    ).rejects.toThrow("Discord post failed: 500");
  });
});

describe("DiscordAdapter.fetchEngagement", () => {
  const adapter = new DiscordAdapter();
  const botToken = "bot_token";
  const channelId = "888777666555444333";
  const messageId = "999000111222333444";
  const compositeId = `${channelId}:${messageId}`;

  it("sums reaction counts as likes and reads thread message_count as comments", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: messageId,
          reactions: [{ count: 3 }, { count: 5 }, { count: 2 }],
          thread: { message_count: 7 },
        }),
    });

    const result = await adapter.fetchEngagement(compositeId, botToken);

    expect(result).not.toBeNull();
    expect(result!.likes).toBe(10);
    expect(result!.comments).toBe(7);
    expect(result!.shares).toBe(0);
    expect(result!.reach).toBe(0);
    expect(result!.impressions).toBe(0);
    expect(result!.engagementRate).toBeNull();
    expect(result!.recordedAt).toBeInstanceOf(Date);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
  });

  it("defaults likes/comments to 0 when reactions and thread are absent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: messageId }),
    });

    const result = await adapter.fetchEngagement(compositeId, botToken);
    expect(result!.likes).toBe(0);
    expect(result!.comments).toBe(0);
  });

  it("returns null when postId is not composite", async () => {
    const result = await adapter.fetchEngagement("not-composite", botToken);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null on 404", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await adapter.fetchEngagement(compositeId, botToken);
    expect(result).toBeNull();
  });

  it("throws AuthExpiredError on 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(
      adapter.fetchEngagement(compositeId, botToken)
    ).rejects.toThrow(AuthExpiredError);
  });

  it("throws RateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(
      adapter.fetchEngagement(compositeId, botToken)
    ).rejects.toThrow(RateLimitError);
  });

  it("throws generic error on other failures", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(
      adapter.fetchEngagement(compositeId, botToken)
    ).rejects.toThrow("Discord engagement fetch failed: 500");
  });
});

describe("DiscordAdapter unsupported OAuth methods", () => {
  const adapter = new DiscordAdapter();

  it("throws NotImplementedError from getAuthUrl", () => {
    expect(() => adapter.getAuthUrl()).toThrow(NotImplementedError);
  });

  it("throws NotImplementedError from exchangeCode", async () => {
    await expect(adapter.exchangeCode()).rejects.toThrow(NotImplementedError);
  });
});
