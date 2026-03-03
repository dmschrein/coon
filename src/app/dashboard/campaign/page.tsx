"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCampaignList, useCreateCampaign } from "@/hooks/use-campaign";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CAMPAIGN_PLATFORMS = [
  { value: "blog", label: "Blog" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "X/Twitter" },
  { value: "pinterest", label: "Pinterest" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "reddit", label: "Reddit" },
  { value: "discord", label: "Discord" },
  { value: "threads", label: "Threads" },
  { value: "email", label: "Email Newsletter" },
];

export default function CampaignPage() {
  const router = useRouter();
  const { data: campaigns, isLoading, error } = useCampaignList();
  const createCampaign = useCreateCampaign();
  const [open, setOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const handleCreate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    try {
      const campaign = await createCampaign.mutateAsync(selectedPlatforms);
      toast.success("Campaign strategy generated!");
      setOpen(false);
      router.push(`/dashboard/campaign/${campaign.id}`);
    } catch (err) {
      toast.error("Failed to create campaign. Please try again.");
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
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
          <p className="text-sm text-destructive">Failed to load campaigns</p>
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
          <p className="text-sm text-muted-foreground">
            Create unified multi-platform marketing campaigns
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>
                Select the platforms you want to include in this campaign.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {CAMPAIGN_PLATFORMS.map((platform) => (
                <div key={platform.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={platform.value}
                    checked={selectedPlatforms.includes(platform.value)}
                    onCheckedChange={() => togglePlatform(platform.value)}
                  />
                  <label
                    htmlFor={platform.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {platform.label}
                  </label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createCampaign.isPending || selectedPlatforms.length === 0}
              >
                {createCampaign.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns && campaigns.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Megaphone className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No campaigns yet</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Create your first campaign to generate a unified content strategy
            across multiple platforms.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map((campaign: any) => (
            <div
              key={campaign.id}
              onClick={() => router.push(`/dashboard/campaign/${campaign.id}`)}
              className="cursor-pointer rounded-lg border p-6 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{campaign.name || "Untitled Campaign"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {campaign.selectedPlatforms?.length || 0} platforms
                  </p>
                </div>
                <div
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    campaign.status === "complete"
                      ? "bg-green-100 text-green-700"
                      : campaign.status === "generating_content"
                      ? "bg-blue-100 text-blue-700"
                      : campaign.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {campaign.status.replace(/_/g, " ")}
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Created{" "}
                {new Date(campaign.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
