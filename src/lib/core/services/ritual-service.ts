/**
 * Ritual Service - activate/deactivate community engagement rituals.
 *
 * Activation clones built-in templates per-user, then seeds 8 future
 * occurrences into the campaign calendar. Deactivation removes future
 * entries (not past) and flips is_active off.
 */

import type {
  CalendarEntryRepository,
  CampaignRepository,
  RitualTemplateRepository,
  RitualTemplateRow,
} from "../repositories/interfaces";
import {
  DEFAULT_POSTING_TIME,
  nextOccurrences,
} from "../domain/ritual-schedule";
import { ServiceError } from "./audience-service";

const RITUAL_OCCURRENCE_COUNT = 8;

export interface ActivateRitualResult {
  ritualId: string;
  count: number;
}

export class RitualService {
  constructor(
    private ritualRepo: RitualTemplateRepository,
    private calendarRepo: CalendarEntryRepository,
    private campaignRepo: CampaignRepository
  ) {}

  async listTemplates(userId: string): Promise<RitualTemplateRow[]> {
    return this.ritualRepo.listForUser(userId);
  }

  async activate(
    templateId: string,
    userId: string,
    campaignId: string
  ): Promise<ActivateRitualResult> {
    const template = await this.ritualRepo.findById(templateId);
    if (!template) {
      throw new ServiceError("Ritual template not found.", "NOT_FOUND");
    }
    if (template.userId !== null && template.userId !== userId) {
      throw new ServiceError("Ritual template not found.", "NOT_FOUND");
    }

    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found.", "CAMPAIGN_NOT_FOUND");
    }

    const activeRitual: RitualTemplateRow =
      template.userId === null
        ? await this.ritualRepo.cloneForUser(template.id, userId)
        : template;

    const dates = nextOccurrences(
      activeRitual.recurrence,
      activeRitual.dayOfWeek,
      RITUAL_OCCURRENCE_COUNT
    );

    await this.calendarRepo.createMany(
      dates.map((scheduledDate, index) => ({
        campaignId,
        userId,
        dayNumber: index + 1,
        platform: activeRitual.platform,
        contentType: "ritual",
        title: activeRitual.name,
        postingTime: DEFAULT_POSTING_TIME,
        pillar: activeRitual.name,
        notes: activeRitual.description ?? undefined,
        scheduledDate,
        ritualTemplateId: activeRitual.id,
      }))
    );

    await this.ritualRepo.setActive(activeRitual.id, userId, true);

    return { ritualId: activeRitual.id, count: dates.length };
  }

  async deactivate(templateId: string, userId: string): Promise<void> {
    const template = await this.ritualRepo.findById(templateId);
    if (!template || template.userId !== userId) {
      throw new ServiceError("Ritual template not found.", "NOT_FOUND");
    }

    await this.calendarRepo.deleteFutureByRitual(
      templateId,
      userId,
      new Date()
    );
    await this.ritualRepo.setActive(templateId, userId, false);
  }
}
