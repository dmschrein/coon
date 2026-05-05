import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { RitualLibrary } from "@/components/engagement/ritual-library";
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
          Activate community rituals to drive consistent engagement
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Ritual Library</h2>
          <p className="text-muted-foreground text-sm">
            One-click templates that schedule the next 8 occurrences.
          </p>
        </div>
        <RitualLibrary
          campaignId={activeCampaign?.id ?? null}
          initialTemplates={initialTemplates}
        />
      </section>
    </div>
  );
}
