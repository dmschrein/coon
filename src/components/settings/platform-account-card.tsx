"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DisconnectDialog } from "./disconnect-dialog";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectedAccount } from "@/types";

export interface PlatformConfig {
  value: string;
  label: string;
  description: string;
  available: boolean;
}

interface PlatformAccountCardProps {
  platform: PlatformConfig;
  account: ConnectedAccount | null;
  onConnect: () => void;
  onDisconnect: (accountId: string) => void;
  onRefresh: (accountId: string) => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isRefreshing: boolean;
  isLoading?: boolean;
}

function isTokenExpiringSoon(account: ConnectedAccount): boolean {
  if (!account.tokenExpiresAt) return false;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return new Date(account.tokenExpiresAt).getTime() - Date.now() < sevenDays;
}

export function PlatformAccountCard({
  platform,
  account,
  onConnect,
  onDisconnect,
  onRefresh,
  isConnecting,
  isDisconnecting,
  isRefreshing,
  isLoading,
}: PlatformAccountCardProps) {
  const [showDisconnect, setShowDisconnect] = useState(false);
  const needsReauth =
    account && (!account.isActive || isTokenExpiringSoon(account));

  return (
    <>
      <Card
        className={cn(
          !platform.available && !account && !isLoading && "opacity-60"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{platform.label}</CardTitle>
            {!isLoading && account && account.isActive && (
              <Badge
                variant="outline"
                className="border-green-500 text-green-600"
              >
                Connected
              </Badge>
            )}
            {!isLoading && account && !account.isActive && (
              <Badge
                variant="outline"
                className="border-yellow-500 text-yellow-600"
              >
                Needs re-auth
              </Badge>
            )}
            {!isLoading && !account && !platform.available && (
              <Badge variant="secondary">Coming Soon</Badge>
            )}
          </div>
          <CardDescription>{platform.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-full rounded-md" />
          ) : account ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {account.profileImageUrl ? (
                  <img
                    src={account.profileImageUrl}
                    alt={account.accountName ?? "Profile"}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
                    {(account.accountName ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium">
                  @{account.accountName}
                </span>
              </div>
              {needsReauth && (
                <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>
                    Token expiring soon — please refresh or re-authorize
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRefresh(account.id)}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={cn(
                      "mr-1.5 h-3.5 w-3.5",
                      isRefreshing && "animate-spin"
                    )}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnect(true)}
                  disabled={isDisconnecting}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={onConnect}
              disabled={!platform.available || isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          )}
        </CardContent>
      </Card>

      {account && (
        <DisconnectDialog
          open={showDisconnect}
          onOpenChange={setShowDisconnect}
          platformLabel={platform.label}
          onConfirm={() => {
            onDisconnect(account.id);
            setShowDisconnect(false);
          }}
          isPending={isDisconnecting}
        />
      )}
    </>
  );
}
