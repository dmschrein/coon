import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { EngagementTabs } from "@/components/engagement/engagement-tabs";
import type { RitualTemplateClient } from "@/hooks/use-rituals";

export default async function EngagementPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { ritualService, campaignRepo } = getContainer();

  const [campaigns, templates] = await Promise.all([
    campaignRepo.findByUserId(userId),
    ritualService.listTemplates(userId),
  ]);

  const activeCampaign =
    campaigns.find((c) => c.status !== "draft" && c.status !== "failed") ??
    campaigns[0] ??
    null;

  const initialTemplates: RitualTemplateClient[] = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Engagement</h1>
        <p className="text-muted-foreground text-sm">
          Rituals, conversation seeds, events, and a weekly health snapshot.
        </p>
      </div>

      <EngagementTabs
        campaignId={activeCampaign?.id ?? null}
        initialTemplates={initialTemplates}
      />
    </div>
  );
}
