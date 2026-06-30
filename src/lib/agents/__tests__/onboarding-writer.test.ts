import { describe, it, expect, vi, beforeEach } from "vitest";
import { CLAUDE_MODEL } from "@/lib/model";
import { ONBOARDING_TIMINGS } from "@/lib/core/domain/onboarding-schedule";
import { generateOnboardingSequence } from "../onboarding-writer";
import {
  onboardingInputFixture,
  onboardingDraftFixture,
} from "../__fixtures__/onboarding";
import { DrizzleOnboardingRepository } from "@/lib/core/repositories/drizzle-onboarding";
import {
  makeFakeDb,
  type FakeRow,
} from "@/lib/core/repositories/__tests__/fake-db";

// Mock the Claude client + the DB connection so importing the agent (which
// transitively loads `./utils` → `@/lib/db`) never touches a real Neon client.
vi.mock("@/lib/claude", () => ({
  anthropic: { messages: { create: vi.fn() } },
}));
vi.mock("@/lib/db", () => ({ db: {} }));

import { anthropic } from "@/lib/claude";

const mockCreate = vi.mocked(anthropic.messages.create);

function mockReply(output: unknown) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(output) }],
    usage: { input_tokens: 500, output_tokens: 800 },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>);
}

beforeEach(() => vi.clearAllMocks());

describe("generateOnboardingSequence", () => {
  it("returns exactly 5 steps", async () => {
    mockReply(onboardingDraftFixture);

    const result = await generateOnboardingSequence(onboardingInputFixture);

    expect(result.steps).toHaveLength(5);
    expect(result.modelUsed).toBe(CLAUDE_MODEL);
  });

  it("orders the 5 steps with the canonical trigger timings", async () => {
    mockReply(onboardingDraftFixture);

    const result = await generateOnboardingSequence(onboardingInputFixture);

    expect(result.steps.map((s) => s.triggerTiming)).toEqual([
      "immediate",
      "day1",
      "day3",
      "day7",
      "day14",
    ]);
    expect(ONBOARDING_TIMINGS).toEqual([
      "immediate",
      "day1",
      "day3",
      "day7",
      "day14",
    ]);
    expect(result.steps.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("gives every email-channel step a non-empty subject", async () => {
    mockReply(onboardingDraftFixture);

    const result = await generateOnboardingSequence(onboardingInputFixture);

    for (const step of result.steps) {
      if (step.channel === "email") {
        expect(step.subject).toBeTruthy();
        expect((step.subject ?? "").length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── activateSequence (repository) ─────────────────────────────────────────────

const CREATED_AT = new Date("2026-06-01T00:00:00.000Z");
const DAY_MS = 86_400_000;

function sequenceRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "seq1",
    userId: "user_123",
    name: "New Member Onboarding",
    isActive: true,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function stepRow(
  stepNumber: number,
  triggerTiming: string,
  overrides: Partial<FakeRow> = {}
): FakeRow {
  return {
    id: `step${stepNumber}`,
    sequenceId: "seq1",
    stepNumber,
    triggerTiming,
    channel: "email",
    subject: `Subject ${stepNumber}`,
    content: `Content ${stepNumber}`,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function fiveSteps(): FakeRow[] {
  return ONBOARDING_TIMINGS.map((timing, i) => stepRow(i + 1, timing));
}

describe("DrizzleOnboardingRepository.getSequence", () => {
  it("returns the latest sequence with its ordered steps", async () => {
    const { db, queue } = makeFakeDb();
    queue.select.push([sequenceRow()]); // latest sequence
    queue.select.push(fiveSteps()); // its steps
    const repo = new DrizzleOnboardingRepository(db);

    const result = await repo.getSequence("user_123");

    expect(result?.id).toBe("seq1");
    expect(result?.steps).toHaveLength(5);
    expect(result?.steps.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns null when the user has no sequence", async () => {
    const { db, queue } = makeFakeDb();
    queue.select.push([]);
    const repo = new DrizzleOnboardingRepository(db);

    expect(await repo.getSequence("user_123")).toBeNull();
  });
});

describe("DrizzleOnboardingRepository.upsertStep", () => {
  it("upserts on the (sequenceId, stepNumber) slot and maps the row", async () => {
    const { db, queue, captured } = makeFakeDb();
    queue.insert.push([stepRow(2, "day1", { subject: "Edited subject" })]);
    const repo = new DrizzleOnboardingRepository(db);

    const saved = await repo.upsertStep("seq1", {
      stepNumber: 2,
      triggerTiming: "day1",
      channel: "email",
      subject: "Edited subject",
      content: "Edited content",
    });

    expect(saved.subject).toBe("Edited subject");
    expect(captured.insertValues).toMatchObject({
      sequenceId: "seq1",
      stepNumber: 2,
      triggerTiming: "day1",
      content: "Edited content",
    });
    expect(captured.onConflictDoUpdate).toBeTruthy();
  });
});

describe("DrizzleOnboardingRepository.activateSequence", () => {
  it("creates exactly 5 calendar_entry rows", async () => {
    const { db, queue, captured } = makeFakeDb();
    queue.update.push([sequenceRow()]); // activate (set is_active=true) returning
    queue.select.push(fiveSteps()); // load steps
    const repo = new DrizzleOnboardingRepository(db);

    await repo.activateSequence("seq1");

    const inserted = captured.insertValues as unknown[];
    expect(inserted).toHaveLength(5);
  });

  it("schedules the immediate step on the sequence created_at (no delay)", async () => {
    const { db, queue, captured } = makeFakeDb();
    queue.update.push([sequenceRow()]);
    queue.select.push(fiveSteps());
    const repo = new DrizzleOnboardingRepository(db);

    await repo.activateSequence("seq1");

    const inserted = captured.insertValues as { scheduledDate: Date }[];
    expect(inserted[0].scheduledDate.getTime()).toBe(CREATED_AT.getTime());
  });

  it("schedules the day14 step 14 days after created_at", async () => {
    const { db, queue, captured } = makeFakeDb();
    queue.update.push([sequenceRow()]);
    queue.select.push(fiveSteps());
    const repo = new DrizzleOnboardingRepository(db);

    await repo.activateSequence("seq1");

    const inserted = captured.insertValues as { scheduledDate: Date }[];
    expect(inserted[4].scheduledDate.getTime()).toBe(
      CREATED_AT.getTime() + 14 * DAY_MS
    );
  });
});
