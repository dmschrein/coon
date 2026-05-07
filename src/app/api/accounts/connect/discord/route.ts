/**
 * Discord Bot Connect API - Stores a Discord Bot Token connected account.
 *
 * POST /api/accounts/connect/discord
 * Body: { botToken, serverId, defaultChannelId }
 * Validates the token via Discord's GET /users/@me before persisting.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { DiscordAdapter } from "@/lib/services/social/discord";
import { discordConnectSchema } from "@/lib/validations/discord-connect";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Invalid JSON body", code: "VALIDATION_ERROR" },
        },
        { status: 400 }
      );
    }

    const parsed = discordConnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid input",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const { botToken, serverId, defaultChannelId } = parsed.data;
    const adapter = new DiscordAdapter();

    let info;
    try {
      info = await adapter.getAccountInfo(botToken);
    } catch {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Invalid Discord bot token",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const { publishService } = getContainer();
    const account = await publishService.connectBotPlatform({
      userId,
      platform: "discord",
      accessToken: botToken,
      accountId: info.accountId,
      accountName: info.accountName,
      profileImageUrl: info.profileImageUrl,
      metadata: { serverId, defaultChannelId },
    });

    return NextResponse.json({
      data: { connected: true, accountId: account.id },
      error: null,
    });
  } catch (error) {
    console.error("Discord connect error:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to connect Discord account",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
