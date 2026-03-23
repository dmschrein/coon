"use client";

import { useRouter } from "next/navigation";
import { useCreateCampaign } from "@/hooks/use-campaign";
import { CampaignCreatorForm } from "@/components/campaign/campaign-creator-form";
import type { CampaignCreatorFormData } from "@/lib/validations/campaign";
import { toast } from "sonner";

export default function NewCampaignPage() {
  const router = useRouter();
  const createCampaign = useCreateCampaign();

  const handleSubmit = async (data: CampaignCreatorFormData) => {
    try {
      const campaign = await createCampaign.mutateAsync(data);
      toast.success("Campaign created! Generating your plan...");
      router.push(`/dashboard/campaign/${campaign.id}`);
    } catch {
      toast.error("Failed to create campaign. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Campaign</h1>
        <p className="text-muted-foreground">
          Define your campaign goals and let AI build your content plan
        </p>
      </div>

      <CampaignCreatorForm
        onSubmit={handleSubmit}
        isSubmitting={createCampaign.isPending}
      />
    </div>
  );
}
