/**
 * StubAdapter — Abstract base for platforms without real API integration yet.
 *
 * Every method throws NotImplementedError. Concrete stubs only set `platform`.
 */

import type {
  SocialPlatformAdapter,
  PostPayload,
  PostResult,
  PlatformEngagement,
} from "./types";
import { NotImplementedError } from "./types";
import type { SocialPlatform } from "@/types";

export abstract class StubAdapter implements SocialPlatformAdapter {
  abstract platform: SocialPlatform;

  getAuthUrl(_redirectUri: string, _state: string): string {
    throw new NotImplementedError(this.platform, "getAuthUrl");
  }

  async exchangeCode(
    _code: string,
    _redirectUri: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    accountId: string;
    accountName: string;
    profileImageUrl?: string;
    scopes?: string[];
  }> {
    throw new NotImplementedError(this.platform, "exchangeCode");
  }

  async refreshAccessToken(_refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    throw new NotImplementedError(this.platform, "refreshAccessToken");
  }

  async getAccountInfo(_accessToken: string): Promise<{
    accountId: string;
    accountName: string;
    profileImageUrl?: string;
  }> {
    throw new NotImplementedError(this.platform, "getAccountInfo");
  }

  async post(_accessToken: string, _payload: PostPayload): Promise<PostResult> {
    throw new NotImplementedError(this.platform, "post");
  }

  async fetchEngagement(
    _postId: string,
    _accessToken: string
  ): Promise<PlatformEngagement | null> {
    throw new NotImplementedError(this.platform, "fetchEngagement");
  }
}
