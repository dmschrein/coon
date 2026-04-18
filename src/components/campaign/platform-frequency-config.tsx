"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ConnectedAccount } from "@/types";

const PLATFORMS = [
  { value: "reddit", label: "Reddit" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "threads", label: "Threads" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "discord", label: "Discord" },
  { value: "blog", label: "Blog" },
  { value: "email", label: "Email" },
  { value: "pinterest", label: "Pinterest" },
] as const;

interface PlatformFrequencyConfigProps {
  selectedPlatforms: string[];
  onPlatformsChange: (platforms: string[]) => void;
  frequencyConfig: Record<string, number>;
  onFrequencyChange: (config: Record<string, number>) => void;
  connectedAccounts?: ConnectedAccount[];
}

export function PlatformFrequencyConfig({
  selectedPlatforms,
  onPlatformsChange,
  frequencyConfig,
  onFrequencyChange,
  connectedAccounts,
}: PlatformFrequencyConfigProps) {
  const togglePlatform = (platform: string) => {
    const updated = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter((p) => p !== platform)
      : [...selectedPlatforms, platform];
    onPlatformsChange(updated);

    // Add default frequency for newly selected platforms
    if (!selectedPlatforms.includes(platform)) {
      onFrequencyChange({ ...frequencyConfig, [platform]: 3 });
    }
  };

  const isConnected = (platform: string) =>
    connectedAccounts?.some((a) => a.platform === platform && a.isActive);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.value);
          const connected = isConnected(platform.value);
          return (
            <div key={platform.value} className="space-y-2">
              <button
                type="button"
                onClick={() => togglePlatform(platform.value)}
                className={cn(
                  "w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="flex items-center justify-between">
                  <span>{platform.label}</span>
                  {connectedAccounts && connected && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {connectedAccounts && !connected && (
                    <Link
                      href="/dashboard/settings?tab=accounts"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground"
                      title="Connect account in Settings"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </span>
              </button>
              {isSelected && (
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={frequencyConfig[platform.value] ?? 3}
                    onChange={(e) =>
                      onFrequencyChange({
                        ...frequencyConfig,
                        [platform.value]: Number(e.target.value),
                      })
                    }
                    className="h-2 flex-1"
                  />
                  <span className="text-muted-foreground w-16 text-xs">
                    {frequencyConfig[platform.value] ?? 3}x/week
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
