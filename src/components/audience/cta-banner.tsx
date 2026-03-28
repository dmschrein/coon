"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCampaignList } from "@/hooks/use-campaign";
import { Plus } from "lucide-react";

export function CtaBanner() {
  const router = useRouter();
  const { data: campaigns } = useCampaignList();

  if (campaigns && campaigns.length > 0) return null;

  return (
    <div className="bg-muted/40 flex items-center justify-between gap-4 rounded-lg border p-6">
      <div>
        <p className="font-semibold">Ready to reach this audience?</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Create your first campaign to start building your community.
        </p>
      </div>
      <Button onClick={() => router.push("/dashboard/campaign/new")}>
        <Plus className="mr-2 h-4 w-4" />
        New Campaign
      </Button>
    </div>
  );
}
