"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RitualLibrary } from "@/components/engagement/ritual-library";
import { SeedGeneratorPanel } from "@/components/engagement/seed-generator-panel";
import { EventPanel } from "@/components/engagement/event-panel";
import { ActivityHealthCard } from "@/components/engagement/activity-health-card";
import type { RitualTemplateClient } from "@/hooks/use-rituals";

interface EngagementTabsProps {
  campaignId: string | null;
  initialTemplates: RitualTemplateClient[];
}

export function EngagementTabs({
  campaignId,
  initialTemplates,
}: EngagementTabsProps) {
  return (
    <Tabs defaultValue="rituals" className="space-y-4">
      <TabsList>
        <TabsTrigger value="rituals">Rituals</TabsTrigger>
        <TabsTrigger value="seeds">Seeds</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="health">Health</TabsTrigger>
      </TabsList>

      <TabsContent value="rituals" className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Ritual Library</h2>
          <p className="text-muted-foreground text-sm">
            One-click templates that schedule the next 8 occurrences.
          </p>
        </div>
        <RitualLibrary
          campaignId={campaignId}
          initialTemplates={initialTemplates}
        />
      </TabsContent>

      <TabsContent value="seeds" className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Conversation Seeds</h2>
          <p className="text-muted-foreground text-sm">
            Generate platform-tuned prompts to spark community engagement.
          </p>
        </div>
        <SeedGeneratorPanel campaignId={campaignId} />
      </TabsContent>

      <TabsContent value="events" className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Events</h2>
          <p className="text-muted-foreground text-sm">
            Schedule event sequences with announcement, reminder, and day-of
            posts.
          </p>
        </div>
        <EventPanel campaignId={campaignId} />
      </TabsContent>

      <TabsContent value="health" className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Activity Health</h2>
          <p className="text-muted-foreground text-sm">
            Snapshot of how your engagement loop is performing this week.
          </p>
        </div>
        <ActivityHealthCard
          campaignId={campaignId}
          initialTemplates={initialTemplates}
        />
      </TabsContent>
    </Tabs>
  );
}
