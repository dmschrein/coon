/**
 * Engagement Notifier - Side-effect helpers that translate engagement
 * ingestion outcomes into user-facing notifications.
 *
 * Pulled out of EnrichmentService to keep that service's surface focused
 * and to give notification rules a single place to evolve.
 */

import type {
  CampaignContentRepository,
  EngagementRepository,
  NotificationRepository,
  PlatformMemberRow,
  PostEngagementRow,
} from "../repositories/interfaces";
import type { CampaignContentEntity } from "../domain/content";

export const TRENDING_MULTIPLIER = 2;
export const ADVOCATE_THRESHOLD = 5;

interface NotifierDeps {
  notificationRepo: NotificationRepository;
  engagementRepo: EngagementRepository;
  contentRepo: CampaignContentRepository;
}

export async function notifyTrendingPost(
  deps: NotifierDeps,
  content: CampaignContentEntity,
  stored: PostEngagementRow
): Promise<void> {
  const rate = stored.engagementRate ? Number(stored.engagementRate) : null;
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return;

  const siblings = await deps.contentRepo.findByCampaignId(content.campaignId);
  const siblingIds = siblings
    .map((c) => c.id)
    .filter((id) => id !== content.id);

  const avg = await deps.engagementRepo.getAverageEngagementRate(siblingIds);
  if (avg === null || avg <= 0) return;

  if (rate < TRENDING_MULTIPLIER * avg) return;

  const link = `/dashboard/campaigns/${content.campaignId}/content/${content.id}`;
  const existing = await deps.notificationRepo.findExistingByLink({
    userId: content.userId,
    type: "post_trending",
    link,
  });
  if (existing) return;

  const titlePart = content.title ?? "Your post";
  await deps.notificationRepo.createNotification({
    userId: content.userId,
    type: "post_trending",
    title: "Your post is trending",
    body: `${titlePart} is at ${rate.toFixed(2)}% engagement — ${TRENDING_MULTIPLIER}× your campaign average.`,
    link,
  });
}

export async function notifyNewAdvocates(
  notificationRepo: NotificationRepository,
  userId: string,
  members: PlatformMemberRow[]
): Promise<void> {
  // Members increment engagementCount by exactly +1 per upsert, so a member
  // who lands at exactly ADVOCATE_THRESHOLD has just crossed the line.
  const newAdvocates = members.filter(
    (m) => m.engagementCount === ADVOCATE_THRESHOLD
  );
  if (newAdvocates.length === 0) return;

  await Promise.allSettled(
    newAdvocates.map((member) =>
      notificationRepo.createNotification({
        userId,
        type: "new_advocate",
        title: "New community advocate",
        body: `${member.displayName ?? member.username} just hit advocate level (${ADVOCATE_THRESHOLD} engagements).`,
        link: `/dashboard/community/${member.id}`,
      })
    )
  );
}
