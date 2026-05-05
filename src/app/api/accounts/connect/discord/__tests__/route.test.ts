import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockConnectBotPlatform = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    publishService: {
      connectBotPlatform: (...args: unknown[]) =>
        mockConnectBotPlatform(...args),
    },
  }),
}));

const mockFetch = vi.fn();

import { POST } from "../route";

const VALID_BODY = {
  botToken: "MTIzNDU2Nzg5MDEyMzQ1Njc4.example_bot_token_value",
  serverId: "111222333444555666",
  defaultChannelId: "888777666555444333",
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/accounts/connect/discord", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

describe("POST /api/accounts/connect/discord", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await POST(jsonRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockConnectBotPlatform).not.toHaveBeenCalled();
  });

  it("returns 400 when botToken is missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const res = await POST(
      jsonRequest({
        serverId: VALID_BODY.serverId,
        defaultChannelId: VALID_BODY.defaultChannelId,
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(mockConnectBotPlatform).not.toHaveBeenCalled();
  });

  it("returns 400 when serverId is not a snowflake", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const res = await POST(
      jsonRequest({
        ...VALID_BODY,
        serverId: "not-a-snowflake",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when Discord rejects the bot token (401)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const res = await POST(jsonRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.message).toBe("Invalid Discord bot token");
    expect(mockConnectBotPlatform).not.toHaveBeenCalled();
  });

  it("persists the connected account on happy path", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: "999000111222333444",
          username: "MyBot",
          avatar: "abc123",
        }),
    });
    mockConnectBotPlatform.mockResolvedValue({ id: "account-uuid-1" });

    const res = await POST(jsonRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data).toEqual({
      connected: true,
      accountId: "account-uuid-1",
    });
    expect(mockConnectBotPlatform).toHaveBeenCalledWith({
      userId: "user_123",
      platform: "discord",
      accessToken: VALID_BODY.botToken,
      accountId: "999000111222333444",
      accountName: "MyBot",
      profileImageUrl:
        "https://cdn.discordapp.com/avatars/999000111222333444/abc123.png",
      metadata: {
        serverId: VALID_BODY.serverId,
        defaultChannelId: VALID_BODY.defaultChannelId,
      },
    });
  });

  it("returns 500 when service layer throws", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: "1", username: "Bot", avatar: null }),
    });
    mockConnectBotPlatform.mockRejectedValue(new Error("DB down"));

    const res = await POST(jsonRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
