/**
 * Community hub progress — pure derivations for the setup checklist.
 *
 * The hub is a four-step, sequentially-gated flow:
 *   manifesto → setup guide → rules → onboarding
 * Each step unlocks only once every earlier step is done. All logic here is a
 * pure function of `CommunityHubData` so it can be unit-tested in isolation and
 * reused by the server component without duplication.
 */

import type { CommunityHubData } from "@/types";

export type HubItemKey = "manifesto" | "setup" | "rules" | "onboarding";

interface HubItemDefinition {
  key: HubItemKey;
  title: string;
  description: string;
  href: string;
  /** How this item is named inside a "Complete X first" lock message. */
  blockerLabel: string;
  /** Extracts this item's completion flag from the hub data. */
  isDone: (data: CommunityHubData) => boolean;
}

/** Ordered checklist definition — the single source of truth for the sequence. */
export const HUB_ITEMS: readonly HubItemDefinition[] = [
  {
    key: "manifesto",
    title: "Community Manifesto",
    description: "Articulate your mission, values, and who it's for.",
    href: "/dashboard/community/manifesto",
    blockerLabel: "manifesto",
    isDone: (d) => d.hasManifesto,
  },
  {
    key: "setup",
    title: "Platform Setup",
    description: "Stand up your community on at least one platform.",
    href: "/dashboard/community/setup",
    blockerLabel: "setup guide",
    isDone: (d) => d.completedSetupGuides.length > 0,
  },
  {
    key: "rules",
    title: "Community Rules",
    description: "Publish positively-framed ground rules.",
    href: "/dashboard/community/rules",
    blockerLabel: "rules",
    isDone: (d) => d.hasRules,
  },
  {
    key: "onboarding",
    title: "Member Onboarding",
    description: "Activate a welcome sequence for new members.",
    href: "/dashboard/community/onboarding",
    blockerLabel: "onboarding",
    isDone: (d) => d.hasActiveOnboarding,
  },
] as const;

/** Percentage (0–100, rounded) of hub items complete. */
export function hubProgressPercent(data: CommunityHubData): number {
  const done = HUB_ITEMS.filter((item) => item.isDone(data)).length;
  return Math.round((done / HUB_ITEMS.length) * 100);
}

export interface ResolvedHubItem {
  key: HubItemKey;
  title: string;
  description: string;
  href: string;
  done: boolean;
  /** Locked until every earlier item is complete. */
  locked: boolean;
  /** "Complete X first", where X is the first unmet prerequisite (empty if unlocked). */
  lockMessage: string;
}

/**
 * Resolve every checklist item's done/locked state. An item is locked when any
 * earlier item is incomplete; its lock message points at the *first* unmet
 * prerequisite so a brand-new user is told to complete the manifesto first.
 */
export function resolveHubItems(data: CommunityHubData): ResolvedHubItem[] {
  const doneFlags = HUB_ITEMS.map((item) => item.isDone(data));
  const firstIncomplete = doneFlags.findIndex((done) => !done);

  return HUB_ITEMS.map((item, index) => {
    const locked = firstIncomplete !== -1 && index > firstIncomplete;
    const blocker = locked ? HUB_ITEMS[firstIncomplete] : null;
    return {
      key: item.key,
      title: item.title,
      description: item.description,
      href: item.href,
      done: doneFlags[index],
      locked,
      lockMessage: blocker ? `Complete ${blocker.blockerLabel} first` : "",
    };
  });
}
