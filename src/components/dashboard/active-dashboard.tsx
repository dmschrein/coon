"use client";

import { MetricsBar } from "@/components/dashboard/metrics-bar";
import { ActiveCampaignCards } from "@/components/dashboard/active-campaigns-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import type { AudienceProfile, ConfidenceLevel } from "@/types";

interface Campaign {
  id: string;
  name: string | null;
  status: string;
  selectedPlatforms: string[];
  goal: string | null;
  createdAt: string;
  content?: { id: string }[];
}

interface ActiveDashboardProps {
  campaigns: Campaign[];
  profile: {
    profileData: AudienceProfile;
    confidenceLevel: ConfidenceLevel;
  };
}

const ACTIVE_STATUSES = new Set([
  "strategy_pending",
  "strategy_complete",
  "calendar_pending",
  "calendar_complete",
  "generating_content",
  "complete",
]);

export function ActiveDashboard({ campaigns, profile }: ActiveDashboardProps) {
  const activeCampaigns = campaigns.filter((c) =>
    ACTIVE_STATUSES.has(c.status)
  );
  const totalContent = campaigns.reduce(
    (sum, c) => sum + (c.content?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your campaign command center</p>
      </div>

      <MetricsBar
        totalCampaigns={campaigns.length}
        activeCampaigns={activeCampaigns.length}
        totalContentPieces={totalContent}
        confidenceLevel={profile.confidenceLevel}
      />

      <ActiveCampaignCards campaigns={campaigns} />

      <QuickActions />
    </div>
  );
}
