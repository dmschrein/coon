"use client";

import Link from "next/link";
import { useCampaignList } from "@/hooks/use-campaign";
import { CampaignCard } from "@/components/campaign/campaign-card";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, Plus } from "lucide-react";

export default function CampaignPage() {
  const { data: campaigns, isLoading, error } = useCampaignList();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4 text-sm">
            Loading campaigns...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-sm">Failed to load campaigns</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-sm">
            Create unified multi-platform marketing campaigns
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/campaign/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {campaigns && campaigns.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Megaphone className="text-muted-foreground h-12 w-12" />
          <h3 className="mt-4 text-lg font-semibold">No campaigns yet</h3>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Create your first campaign to generate a unified content strategy
            across multiple platforms.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/campaign/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map(
            (campaign: {
              id: string;
              name: string | null;
              selectedPlatforms: string[] | null;
              status: string;
              goal: string | null;
              createdAt: string;
            }) => (
              <CampaignCard
                key={campaign.id}
                id={campaign.id}
                name={campaign.name}
                status={campaign.status}
                selectedPlatforms={campaign.selectedPlatforms ?? []}
                goal={campaign.goal}
                createdAt={campaign.createdAt}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
