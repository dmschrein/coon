"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/campaign/campaign-card";
import { PlusCircle } from "lucide-react";

interface Campaign {
  id: string;
  name: string | null;
  status: string;
  selectedPlatforms: string[];
  goal: string | null;
  createdAt: string;
}

interface ActiveCampaignCardsProps {
  campaigns: Campaign[];
}

export function ActiveCampaignCards({ campaigns }: ActiveCampaignCardsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Campaigns</h2>
        <Button asChild size="sm">
          <Link href="/dashboard/campaign/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            id={campaign.id}
            name={campaign.name}
            status={campaign.status}
            selectedPlatforms={campaign.selectedPlatforms}
            goal={campaign.goal}
            createdAt={campaign.createdAt}
          />
        ))}
      </div>
    </div>
  );
}
