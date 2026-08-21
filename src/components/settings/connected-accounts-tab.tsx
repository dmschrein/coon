"use client";

import {
  useConnectedAccounts,
  useConnectPlatform,
  useConnectThreadsViaInstagram,
  useDisconnectAccount,
  useRefreshAccount,
} from "@/hooks/use-connected-accounts";
import { PlatformAccountCard } from "./platform-account-card";
import { toast } from "sonner";
import type { PlatformConfig } from "./platform-account-card";
import type { SocialPlatform } from "@/types";

const PLATFORMS: PlatformConfig[] = [
  {
    value: "reddit",
    label: "Reddit",
    description:
      "Connect your Reddit account to post directly from Community Builder",
    available: true,
  },
  {
    value: "instagram",
    label: "Instagram",
    description:
      "Connect your Instagram account to publish content automatically",
    available: true,
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    description:
      "Connect your LinkedIn account to share posts with your professional network",
    available: true,
  },
  {
    value: "tiktok",
    label: "TikTok",
    description: "Share short-form video content on TikTok",
    available: false,
  },
  {
    value: "threads",
    label: "Threads",
    description: "Post text-based content to Threads",
    available: true,
  },
  {
    value: "youtube",
    label: "YouTube",
    description: "Publish Community posts to your YouTube channel",
    available: true,
  },
  {
    value: "twitter",
    label: "Twitter/X",
    description: "Share updates and engage on Twitter/X",
    available: true,
  },
  {
    value: "pinterest",
    label: "Pinterest",
    description: "Create pins on your Pinterest boards from campaign content",
    available: true,
  },
];

export function ConnectedAccountsTab() {
  const { data: accounts, isLoading } = useConnectedAccounts();
  const connectPlatform = useConnectPlatform();
  const connectThreadsViaInstagram = useConnectThreadsViaInstagram();
  const disconnectAccount = useDisconnectAccount();
  const refreshAccount = useRefreshAccount();

  const handleConnect = (platform: string) => {
    connectPlatform.mutate(platform as SocialPlatform, {
      onError: (error) => {
        toast.error(`Failed to connect: ${error.message}`);
      },
    });
  };

  const handleDisconnect = (accountId: string) => {
    disconnectAccount.mutate(accountId, {
      onSuccess: () => toast.success("Account disconnected"),
      onError: (error) => toast.error(`Failed to disconnect: ${error.message}`),
    });
  };

  // Threads shares a Meta app with Instagram, so an existing Instagram
  // connection can be traded for a Threads one without a second OAuth trip.
  const instagramConnected = !!accounts?.some(
    (a) => a.platform === "instagram" && a.isActive
  );

  const handleConnectThreadsViaInstagram = () => {
    connectThreadsViaInstagram.mutate(undefined, {
      onSuccess: () => toast.success("Threads connected from Instagram"),
      onError: (error) => toast.error(`Failed to connect: ${error.message}`),
    });
  };

  const handleRefresh = (accountId: string) => {
    refreshAccount.mutate(accountId, {
      onSuccess: () => toast.success("Tokens refreshed successfully"),
      onError: (error) => toast.error(`Failed to refresh: ${error.message}`),
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORMS.map((platform) => {
        const account =
          accounts?.find((a) => a.platform === platform.value) ?? null;

        return (
          <PlatformAccountCard
            key={platform.value}
            platform={platform}
            account={account}
            onConnect={() => handleConnect(platform.value)}
            shortcut={
              platform.value === "threads" && instagramConnected && !account
                ? {
                    label: "Connect with Instagram",
                    onConnect: handleConnectThreadsViaInstagram,
                    isConnecting: connectThreadsViaInstagram.isPending,
                  }
                : undefined
            }
            onDisconnect={handleDisconnect}
            onRefresh={handleRefresh}
            isConnecting={
              connectPlatform.isPending &&
              connectPlatform.variables === platform.value
            }
            isDisconnecting={
              disconnectAccount.isPending &&
              disconnectAccount.variables === account?.id
            }
            isRefreshing={
              refreshAccount.isPending &&
              refreshAccount.variables === account?.id
            }
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
}
