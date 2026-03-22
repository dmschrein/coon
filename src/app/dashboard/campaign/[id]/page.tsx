"use client";

import { use } from "react";
import type { CampaignStrategy } from "@/types";
import {
  useCampaign,
  useGenerateCalendar,
  useGenerateNextBatch,
} from "@/hooks/use-campaign";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useCampaign(id);
  const generateCalendar = useGenerateCalendar(id);
  const generateNextBatch = useGenerateNextBatch(id);

  const handleGenerateCalendar = async () => {
    try {
      await generateCalendar.mutateAsync();
      toast.success("Calendar generated!");
    } catch {
      toast.error("Failed to generate calendar");
    }
  };

  const handleGenerateNextBatch = async () => {
    try {
      const result = await generateNextBatch.mutateAsync();
      toast.success(
        `Generated content for ${result.completed.length} platforms`
      );
    } catch {
      toast.error("Failed to generate content");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-4 text-sm">
            Loading campaign...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-sm">Failed to load campaign</p>
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

  const { campaign, content, calendarEntries } = data;
  const strategy = campaign.strategyData as CampaignStrategy | null;

  const pendingContent = content.filter(
    (c: { status: string }) => c.status === "pending" || c.status === "failed"
  );
  const completedContent = content.filter(
    (c: { status: string }) => c.status === "complete"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground text-sm">
          {campaign.selectedPlatforms?.length || 0} platforms
        </p>
      </div>

      {/* Strategy Summary */}
      {strategy && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Campaign Strategy</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Theme:</span> {strategy.theme}
            </div>
            <div>
              <span className="font-medium">Goal:</span> {strategy.goal}
            </div>
            <div>
              <span className="font-medium">Timeline:</span>{" "}
              {strategy.timelineWeeks} weeks
            </div>
            <div>
              <span className="font-medium">Core Message:</span>{" "}
              {strategy.messagingFramework?.coreMessage}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Generation */}
      {campaign.status === "strategy_complete" && (
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Campaign Calendar</h2>
              <p className="text-muted-foreground text-sm">
                Generate a posting schedule for your campaign
              </p>
            </div>
            <Button
              onClick={handleGenerateCalendar}
              disabled={generateCalendar.isPending}
            >
              {generateCalendar.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Calendar className="mr-2 h-4 w-4" />
              Generate Calendar
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Display */}
      {campaign.calendarData && calendarEntries.length > 0 && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Posting Schedule</h2>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {calendarEntries.map(
              (entry: {
                id: string;
                dayNumber: number;
                title: string;
                platform: string;
                postingTime: string;
              }) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div className="text-muted-foreground font-mono text-sm">
                    Day {entry.dayNumber}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{entry.title}</div>
                    <div className="text-muted-foreground text-xs">
                      {entry.platform} • {entry.postingTime}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Content Generation Progress */}
      {(campaign.status === "calendar_complete" ||
        campaign.status === "generating_content" ||
        campaign.status === "complete") && (
        <div className="rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Platform Content</h2>
              <p className="text-muted-foreground text-sm">
                {completedContent.length} of {content.length} platforms complete
              </p>
            </div>
            {pendingContent.length > 0 && (
              <Button
                onClick={handleGenerateNextBatch}
                disabled={generateNextBatch.isPending}
              >
                {generateNextBatch.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Next Batch
              </Button>
            )}
          </div>

          {/* Platform Status List */}
          <div className="space-y-2">
            {content.map(
              (item: { id: string; platform: string; status: string }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-medium capitalize">
                      {item.platform}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      item.status === "complete"
                        ? "bg-green-100 text-green-700"
                        : item.status === "generating"
                          ? "bg-blue-100 text-blue-700"
                          : item.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.status}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
