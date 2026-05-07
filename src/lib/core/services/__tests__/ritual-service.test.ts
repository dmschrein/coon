import { describe, it, expect, vi, beforeEach } from "vitest";
import { RitualService } from "../ritual-service";
import { ServiceError } from "../audience-service";
import type {
  CalendarEntryRepository,
  CampaignRepository,
  RitualTemplateRepository,
  RitualTemplateRow,
} from "../../repositories/interfaces";

const makeBuiltIn = (
  overrides: Partial<RitualTemplateRow> = {}
): RitualTemplateRow => ({
  id: "builtin-1",
  userId: null,
  name: "Monday Wins",
  description: "desc",
  platform: "twitter",
  promptTemplate: "tmpl",
  recurrence: "weekly",
  dayOfWeek: 1,
  isActive: false,
  sourceTemplateId: null,
  createdAt: new Date(),
  ...overrides,
});

describe("RitualService", () => {
  let ritualRepo: {
    [K in keyof RitualTemplateRepository]: ReturnType<typeof vi.fn>;
  };
  let calendarRepo: {
    [K in keyof CalendarEntryRepository]: ReturnType<typeof vi.fn>;
  };
  let campaignRepo: {
    [K in keyof CampaignRepository]: ReturnType<typeof vi.fn>;
  };
  let service: RitualService;

  beforeEach(() => {
    ritualRepo = {
      listForUser: vi.fn(),
      findById: vi.fn(),
      cloneForUser: vi.fn(),
      setActive: vi.fn(),
    };
    calendarRepo = {
      findByCampaignId: vi.fn(),
      createMany: vi.fn(),
      deleteFutureByRitual: vi.fn(),
    };
    campaignRepo = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      updatePlan: vi.fn(),
      updateStrategy: vi.fn(),
      updateCalendar: vi.fn(),
      updateStatus: vi.fn(),
      updateCompletedPlatforms: vi.fn(),
      updateFields: vi.fn(),
      updateCohesionResult: vi.fn(),
      delete: vi.fn(),
    };

    service = new RitualService(
      ritualRepo as unknown as RitualTemplateRepository,
      calendarRepo as unknown as CalendarEntryRepository,
      campaignRepo as unknown as CampaignRepository
    );
  });

  describe("activate", () => {
    it("clones a built-in, schedules 8 entries, and flips isActive", async () => {
      const builtIn = makeBuiltIn();
      const cloned: RitualTemplateRow = {
        ...builtIn,
        id: "clone-1",
        userId: "u1",
        sourceTemplateId: builtIn.id,
        isActive: true,
      };
      ritualRepo.findById.mockResolvedValue(builtIn);
      campaignRepo.findById.mockResolvedValue({ id: "c1" });
      ritualRepo.cloneForUser.mockResolvedValue(cloned);

      const result = await service.activate(builtIn.id, "u1", "c1");

      expect(result).toEqual({ ritualId: "clone-1", count: 8 });
      expect(ritualRepo.cloneForUser).toHaveBeenCalledWith(builtIn.id, "u1");
      expect(calendarRepo.createMany).toHaveBeenCalledTimes(1);

      const entries = calendarRepo.createMany.mock.calls[0][0];
      expect(entries).toHaveLength(8);
      expect(entries[0]).toMatchObject({
        campaignId: "c1",
        userId: "u1",
        platform: "twitter",
        contentType: "ritual",
        title: "Monday Wins",
        ritualTemplateId: "clone-1",
      });

      expect(ritualRepo.setActive).toHaveBeenCalledWith("clone-1", "u1", true);
    });

    it("activates a user-owned ritual without re-cloning", async () => {
      const owned: RitualTemplateRow = makeBuiltIn({
        id: "own-1",
        userId: "u1",
        sourceTemplateId: "builtin-1",
      });
      ritualRepo.findById.mockResolvedValue(owned);
      campaignRepo.findById.mockResolvedValue({ id: "c1" });

      const result = await service.activate(owned.id, "u1", "c1");

      expect(ritualRepo.cloneForUser).not.toHaveBeenCalled();
      expect(result.ritualId).toBe("own-1");
      expect(ritualRepo.setActive).toHaveBeenCalledWith("own-1", "u1", true);
    });

    it("throws NOT_FOUND when template is missing", async () => {
      ritualRepo.findById.mockResolvedValue(null);

      await expect(
        service.activate("missing", "u1", "c1")
      ).rejects.toThrowError(ServiceError);
    });

    it("throws NOT_FOUND when ritual belongs to a different user", async () => {
      ritualRepo.findById.mockResolvedValue(
        makeBuiltIn({ id: "other", userId: "u2" })
      );

      await expect(service.activate("other", "u1", "c1")).rejects.toThrow(
        /not found/i
      );
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign is missing", async () => {
      ritualRepo.findById.mockResolvedValue(makeBuiltIn());
      campaignRepo.findById.mockResolvedValue(null);

      await expect(
        service.activate("builtin-1", "u1", "missing")
      ).rejects.toThrow(/campaign/i);
    });
  });

  describe("deactivate", () => {
    it("deletes future entries and flips isActive off", async () => {
      ritualRepo.findById.mockResolvedValue(
        makeBuiltIn({ id: "own-1", userId: "u1", isActive: true })
      );
      calendarRepo.deleteFutureByRitual.mockResolvedValue(8);

      await service.deactivate("own-1", "u1");

      expect(calendarRepo.deleteFutureByRitual).toHaveBeenCalledWith(
        "own-1",
        "u1",
        expect.any(Date)
      );
      expect(ritualRepo.setActive).toHaveBeenCalledWith("own-1", "u1", false);
    });

    it("rejects deactivating a built-in (user_id null)", async () => {
      ritualRepo.findById.mockResolvedValue(makeBuiltIn());

      await expect(service.deactivate("builtin-1", "u1")).rejects.toThrow(
        /not found/i
      );
      expect(ritualRepo.setActive).not.toHaveBeenCalled();
    });

    it("rejects deactivating another user's ritual", async () => {
      ritualRepo.findById.mockResolvedValue(
        makeBuiltIn({ id: "x", userId: "u2" })
      );

      await expect(service.deactivate("x", "u1")).rejects.toThrow();
    });
  });

  describe("listTemplates", () => {
    it("delegates to repository", async () => {
      const items = [makeBuiltIn()];
      ritualRepo.listForUser.mockResolvedValue(items);

      const result = await service.listTemplates("u1");

      expect(ritualRepo.listForUser).toHaveBeenCalledWith("u1");
      expect(result).toBe(items);
    });
  });
});
