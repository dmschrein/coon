"use client";

import { useAudienceProfile } from "@/hooks/use-audience-profile";
import { useCampaignList } from "@/hooks/use-campaign";
import { PreQuizState } from "@/components/dashboard/pre-quiz-state";
import { PostQuizState } from "@/components/dashboard/post-quiz-state";
import { ActiveDashboard } from "@/components/dashboard/active-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: profile, isLoading: isLoadingProfile } = useAudienceProfile();
  const { data: campaigns, isLoading: isLoadingCampaigns } = useCampaignList();

  if (isLoadingProfile || isLoadingCampaigns) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return <PreQuizState />;
  }

  const hasCampaigns = campaigns && campaigns.length > 0;

  if (!hasCampaigns) {
    return <PostQuizState profile={profile} />;
  }

  return <ActiveDashboard campaigns={campaigns} profile={profile} />;
}
