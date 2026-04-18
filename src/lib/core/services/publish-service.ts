/**
 * Publish Service - Orchestrates OAuth connections and content publishing.
 *
 * Manages connected accounts and delegates posting to platform adapters.
 */

import type {
  ConnectedAccountRepository,
  CampaignContentRepository,
} from "../repositories/interfaces";
import type {
  SocialPlatform,
  ConnectedAccount,
  PublishResult,
  CampaignPlatform,
} from "@/types";
import type {
  SocialPlatformAdapter,
  PostPayload,
} from "@/lib/services/social/types";
import { encrypt, decrypt } from "@/lib/crypto";
import { ServiceError } from "./audience-service";

type AdapterRegistry = (
  platform: SocialPlatform
) => SocialPlatformAdapter | null;

export class PublishService {
  constructor(
    private accountRepo: ConnectedAccountRepository,
    private contentRepo: CampaignContentRepository,
    private getAdapter: AdapterRegistry
  ) {}

  // ─── Connected Accounts ─────────────────────────────────────────────────────

  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    return this.accountRepo.findByUserId(userId);
  }

  getAuthUrl(
    platform: SocialPlatform,
    redirectUri: string,
    state: string
  ): string {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ServiceError(`Platform ${platform} is not supported`);
    }
    return adapter.getAuthUrl(redirectUri, state);
  }

  async handleOAuthCallback(
    userId: string,
    platform: SocialPlatform,
    code: string,
    redirectUri: string
  ): Promise<ConnectedAccount> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ServiceError(`Platform ${platform} is not supported`);
    }

    const tokens = await adapter.exchangeCode(code, redirectUri);

    // Deactivate existing account for this platform if any
    const existing = await this.accountRepo.findByUserAndPlatform(
      userId,
      platform
    );
    if (existing) {
      await this.accountRepo.deactivate(existing.id);
    }

    return this.accountRepo.create({
      userId,
      platform,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      refreshTokenEncrypted: tokens.refreshToken
        ? encrypt(tokens.refreshToken)
        : undefined,
      tokenExpiresAt: tokens.expiresAt,
      accountName: tokens.accountName,
      accountId: tokens.accountId,
      profileImageUrl: tokens.profileImageUrl,
      scopes: tokens.scopes,
    });
  }

  async disconnectAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.accountRepo.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new ServiceError("Account not found");
    }
    await this.accountRepo.deactivate(accountId);
  }

  async refreshAccountTokens(
    userId: string,
    accountId: string
  ): Promise<ConnectedAccount> {
    const account = await this.accountRepo.findByIdWithTokens(accountId);
    if (!account || account.userId !== userId) {
      throw new ServiceError("Account not found");
    }

    const adapter = this.getAdapter(account.platform);
    if (!adapter || !adapter.refreshAccessToken) {
      throw new ServiceError(
        `Token refresh not supported for ${account.platform}`
      );
    }

    // For Instagram, the access token itself is used as the refresh token
    const refreshToken = account.refreshTokenEncrypted
      ? decrypt(account.refreshTokenEncrypted)
      : decrypt(account.accessTokenEncrypted);

    try {
      const newTokens = await adapter.refreshAccessToken(refreshToken);

      await this.accountRepo.updateTokens(
        accountId,
        encrypt(newTokens.accessToken),
        newTokens.refreshToken ? encrypt(newTokens.refreshToken) : undefined,
        newTokens.expiresAt
      );

      return (await this.accountRepo.findById(accountId))!;
    } catch {
      await this.accountRepo.deactivate(accountId);
      throw new ServiceError(
        `Token refresh failed for ${account.platform}. Please re-authorize.`
      );
    }
  }

  // ─── Publishing ─────────────────────────────────────────────────────────────

  async publishContent(
    userId: string,
    contentId: string
  ): Promise<PublishResult> {
    const content = await this.contentRepo.findById(contentId);
    if (!content) {
      throw new ServiceError("Content not found");
    }
    if (content.userId !== userId) {
      throw new ServiceError("Unauthorized");
    }
    if (content.approvalStatus !== "approved") {
      throw new ServiceError("Content must be approved before publishing");
    }

    const platform = content.platform as SocialPlatform;
    const account = await this.accountRepo.findByUserAndPlatformWithTokens(
      userId,
      platform
    );
    if (!account) {
      throw new ServiceError(
        `No connected ${platform} account. Connect your account first.`
      );
    }

    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new ServiceError(`Platform ${platform} is not supported`);
    }

    const payload = this.buildPostPayload(content);
    const accessToken = decrypt(account.accessTokenEncrypted);

    try {
      const result = await adapter.post(accessToken, payload);
      await this.contentRepo.updateStatus(contentId, "complete");

      return {
        contentId,
        status: "published",
        externalPostId: result.externalPostId,
        externalPostUrl: result.externalPostUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown publish error";
      return {
        contentId,
        status: "failed",
        error: message,
      };
    }
  }

  async scheduleContent(
    userId: string,
    contentId: string,
    scheduledFor: Date
  ): Promise<void> {
    const content = await this.contentRepo.findById(contentId);
    if (!content) {
      throw new ServiceError("Content not found");
    }
    if (content.userId !== userId) {
      throw new ServiceError("Unauthorized");
    }

    await this.contentRepo.updateApprovalStatus(contentId, "approved");
  }

  private buildPostPayload(content: {
    platform: CampaignPlatform;
    title: string | null;
    body: string | null;
    contentData: unknown;
  }): PostPayload {
    const data = content.contentData as Record<string, unknown> | null;

    return {
      title: content.title ?? (data?.title as string) ?? undefined,
      body:
        content.body ??
        (data?.body as string) ??
        (data?.postBody as string) ??
        "",
      hashtags: (data?.hashtags as string[]) ?? undefined,
      mediaUrls: (data?.mediaUrls as string[]) ?? undefined,
      subreddit: (data?.suggestedSubreddits as string[])?.[0] ?? undefined,
      communityTarget: (data?.targetCommunity as string) ?? undefined,
    };
  }
}
