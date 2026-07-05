import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HubChecklistItem } from "./hub-checklist-item";
import {
  hubProgressPercent,
  resolveHubItems,
} from "@/lib/community/hub-progress";
import type { CommunityHubData } from "@/types";

interface CommunityHubProps {
  data: CommunityHubData;
  /** First ~100 chars of the manifesto mission, shown in the summary. */
  missionPreview?: string;
  /** Exact number of published community rules, shown in the summary. */
  rulesCount?: number;
}

export function CommunityHub({
  data,
  missionPreview,
  rulesCount,
}: CommunityHubProps) {
  const percent = hubProgressPercent(data);
  const items = resolveHubItems(data);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Community Hub</h1>
        <p className="text-muted-foreground text-sm">
          Set up your community step by step before you launch.
        </p>
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Setup progress</span>
          <span>{percent}%</span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Community setup progress"
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>

      <ul className="space-y-3">
        {items.map((item, index) => (
          <HubChecklistItem key={item.key} item={item} position={index + 1} />
        ))}
      </ul>

      <HubSummary
        data={data}
        missionPreview={missionPreview}
        rulesCount={rulesCount}
      />
    </div>
  );
}

function HubSummary({ data, missionPreview, rulesCount }: CommunityHubProps) {
  const { completedSetupGuides, hasRules, hasActiveOnboarding, memberCount } =
    data;

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Users className="text-muted-foreground h-5 w-5" />
        <span className="text-sm">
          <span data-testid="hub-member-count" className="font-semibold">
            {memberCount}
          </span>{" "}
          {memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      {missionPreview ? (
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">Mission: </span>
          {missionPreview}
        </p>
      ) : null}

      <div className="space-y-1">
        <p className="text-sm font-medium">Platform setup</p>
        {completedSetupGuides.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {completedSetupGuides.map((platform) => (
              <Badge
                key={platform}
                className="border-transparent bg-green-600 text-white capitalize"
              >
                {platform} — set up
              </Badge>
            ))}
          </div>
        ) : (
          <Badge variant="secondary">No platforms set up yet</Badge>
        )}
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
        <span>Rules: {rulesCount ?? (hasRules ? "published" : 0)}</span>
        <span>Onboarding: {hasActiveOnboarding ? "active" : "inactive"}</span>
      </div>
    </section>
  );
}
