"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, Unlink } from "lucide-react";
import {
  useConnectedAccounts,
  useConnectPlatform,
  useDisconnectAccount,
} from "@/hooks/use-connected-accounts";
import type { SocialPlatform, ConnectedAccount } from "@/types";

interface ConnectedAccountsBarProps {
  requiredPlatforms: SocialPlatform[];
}

const platformLabels: Record<SocialPlatform, string> = {
  reddit: "Reddit",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter / X",
  youtube: "YouTube",
  threads: "Threads",
  linkedin: "LinkedIn",
};

export function ConnectedAccountsBar({
  requiredPlatforms,
}: ConnectedAccountsBarProps) {
  const { data: accounts, isLoading } = useConnectedAccounts();
  const connectPlatform = useConnectPlatform();
  const disconnectAccount = useDisconnectAccount();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">
          Loading accounts...
        </span>
      </div>
    );
  }

  const connectedMap = new Map<string, ConnectedAccount>();
  for (const account of accounts ?? []) {
    connectedMap.set(account.platform, account);
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Connected Accounts</h3>
      <div className="flex flex-wrap gap-3">
        {requiredPlatforms.map((platform) => {
          const account = connectedMap.get(platform);
          const isConnected = !!account;

          return (
            <div
              key={platform}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <span className="text-sm font-medium">
                {platformLabels[platform]}
              </span>
              {isConnected ? (
                <>
                  <Badge variant="default" className="text-xs">
                    {account.accountName ?? "Connected"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => disconnectAccount.mutate(account.id)}
                    disabled={disconnectAccount.isPending}
                  >
                    <Unlink className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => connectPlatform.mutate(platform)}
                  disabled={connectPlatform.isPending}
                >
                  {connectPlatform.isPending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Link2 className="mr-1 h-3 w-3" />
                  )}
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
