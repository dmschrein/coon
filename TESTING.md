# Testing Guide

This document covers how to set up and write tests for the Community Builder project.

## Stack

- **Vitest** — unit and integration test runner
- **React Testing Library** — component tests
- **MSW (Mock Service Worker)** — API mocking for integration tests

## 1. Installation

From the `community-builder/` directory:

```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  msw
```

## 2. Configuration

### vitest.config.ts

Create `community-builder/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/components/ui/**",
        "src/lib/db/migrations/**",
        "src/types/**",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
      ],
      thresholds: {
        "src/lib/**": { statements: 80 },
        "src/hooks/**": { statements: 70 },
        "src/components/**": { statements: 60 },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### src/test-setup.ts

Create `community-builder/src/test-setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";

// Stub env vars so src/lib/claude.ts doesn't warn during import
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key-000000");
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
```

### package.json scripts

Add to `community-builder/package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 3. File Organization

Tests live in `__tests__/` directories next to the source they test:

```
src/lib/agents/audience-analysis.ts
src/lib/agents/__tests__/audience-analysis.test.ts

src/lib/agents/utils.ts
src/lib/agents/__tests__/utils.test.ts

src/lib/validations/campaign.ts
src/lib/validations/__tests__/campaign.test.ts

src/hooks/use-campaign.ts
src/hooks/__tests__/use-campaign.test.ts

src/components/audience/persona-card.tsx
src/components/audience/__tests__/persona-card.test.tsx

src/app/api/campaign/route.ts
src/app/api/campaign/__tests__/route.test.ts
```

## 4. Mocking Patterns

### Mock the Anthropic client

```typescript
vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

// In tests:
import { anthropic } from "@/lib/claude";

vi.mocked(anthropic.messages.create).mockResolvedValue({
  content: [{ type: "text", text: JSON.stringify(expectedOutput) }],
  usage: { input_tokens: 100, output_tokens: 200 },
} as any);
```

### Mock Clerk auth

```typescript
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// In tests:
import { auth } from "@clerk/nextjs/server";

// Authenticated:
vi.mocked(auth).mockResolvedValue({ userId: "user_test123" } as any);

// Unauthenticated:
vi.mocked(auth).mockResolvedValue({ userId: null } as any);
```

### Mock Drizzle DB

```typescript
vi.mock("@/lib/db", () => {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(mockChain),
      insert: vi.fn().mockReturnValue(mockChain),
      update: vi.fn().mockReturnValue(mockChain),
      delete: vi.fn().mockReturnValue(mockChain),
    },
  };
});
```

### Mock agent utils (logAgentRun)

```typescript
vi.mock("@/lib/agents/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agents/utils")>();
  return {
    ...actual,
    logAgentRun: vi.fn(), // no-op — skip DB writes
  };
});
```

### Fake timers for withRetry

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Advance through exponential backoff:
vi.advanceTimersByTime(1000); // first retry delay
vi.advanceTimersByTime(2000); // second retry delay
```

## 5. Test Examples

### Utility functions — extractJSON

`src/lib/agents/__tests__/utils.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractJSON, withRetry } from "../utils";

describe("extractJSON", () => {
  it("parses raw JSON string", () => {
    const input = '{"name": "test"}';
    expect(extractJSON(input)).toEqual({ name: "test" });
  });

  it("extracts JSON from markdown code block", () => {
    const input = 'Here is the result:\n```json\n{"name": "test"}\n```';
    expect(extractJSON(input)).toEqual({ name: "test" });
  });

  it("extracts JSON embedded in surrounding text", () => {
    const input = 'Sure! Here is the output: {"name": "test"} Hope that helps!';
    expect(extractJSON(input)).toEqual({ name: "test" });
  });

  it("handles JSON arrays", () => {
    const input = '[{"id": 1}, {"id": 2}]';
    expect(extractJSON(input)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("throws on invalid input", () => {
    expect(() => extractJSON("no json here")).toThrow(
      "Could not extract valid JSON from response"
    );
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and returns on success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, 1);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    const promise = withRetry(fn, 1);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(2); // initial + 1 retry
  });
});
```

### Utility functions — cn

`src/lib/__tests__/utils.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});
```

### Zod validation schemas

`src/lib/validations/__tests__/quiz.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { productDefinitionSchema, fullQuizSchema } from "../quiz";

const validProductDefinition = {
  productType: "saas",
  elevatorPitch: "An AI tool that helps founders build audiences",
  problemSolved: "Founders struggle to build pre-launch audiences",
  uniqueAngle: "AI-generated content tailored to specific audiences",
  currentStage: "mvp",
};

describe("productDefinitionSchema", () => {
  it("accepts valid input", () => {
    const result = productDefinitionSchema.safeParse(validProductDefinition);
    expect(result.success).toBe(true);
  });

  it("rejects invalid productType", () => {
    const result = productDefinitionSchema.safeParse({
      ...validProductDefinition,
      productType: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects elevator pitch under 10 characters", () => {
    const result = productDefinitionSchema.safeParse({
      ...validProductDefinition,
      elevatorPitch: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects elevator pitch over 280 characters", () => {
    const result = productDefinitionSchema.safeParse({
      ...validProductDefinition,
      elevatorPitch: "x".repeat(281),
    });
    expect(result.success).toBe(false);
  });
});
```

`src/lib/validations/__tests__/campaign.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  campaignStrategySchema,
  blogContentSchema,
  campaignPlatformSchema,
} from "../campaign";

const validStrategy = {
  campaignName: "Launch Campaign",
  theme: "Product awareness",
  goal: "Build pre-launch audience",
  targetOutcome: "500 signups",
  timelineWeeks: 4,
  messagingFramework: {
    coreMessage: "Build your audience before you build your product",
    supportingMessages: ["Validate before you invest"],
    toneGuidelines: "Professional yet approachable",
    keyPhrases: ["pre-launch", "audience first"],
    avoidPhrases: ["guaranteed growth"],
  },
  platformAllocations: [
    {
      platform: "twitter",
      role: "Primary engagement",
      contentFocus: "Threads and conversations",
      frequencySuggestion: "Daily",
      priorityOrder: 1,
    },
  ],
  contentPillars: [
    {
      theme: "Audience building",
      description: "How to build an audience",
      sampleTopics: ["Finding your niche"],
      targetedPainPoint: "No audience at launch",
    },
  ],
  audienceHooks: ["Are you building in public?"],
};

describe("campaignStrategySchema", () => {
  it("accepts valid strategy", () => {
    const result = campaignStrategySchema.safeParse(validStrategy);
    expect(result.success).toBe(true);
  });

  it("rejects empty campaignName", () => {
    const result = campaignStrategySchema.safeParse({
      ...validStrategy,
      campaignName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing platformAllocations", () => {
    const { platformAllocations, ...rest } = validStrategy;
    const result = campaignStrategySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty contentPillars array", () => {
    const result = campaignStrategySchema.safeParse({
      ...validStrategy,
      contentPillars: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("campaignPlatformSchema", () => {
  it("accepts valid platforms", () => {
    expect(campaignPlatformSchema.safeParse("twitter").success).toBe(true);
    expect(campaignPlatformSchema.safeParse("blog").success).toBe(true);
  });

  it("rejects invalid platform", () => {
    expect(campaignPlatformSchema.safeParse("facebook").success).toBe(false);
  });
});

describe("blogContentSchema", () => {
  it("accepts valid blog content", () => {
    const result = blogContentSchema.safeParse({
      title: "How to Build an Audience",
      metaDescription: "A guide to audience building",
      keywords: ["audience", "marketing"],
      headers: [{ level: 1, text: "Introduction" }],
      bodyMarkdown: "# Introduction\n\nSome content here.",
      internalLinkingSuggestions: [],
      cta: "Sign up now",
      estimatedReadTime: "5 min",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty bodyMarkdown", () => {
    const result = blogContentSchema.safeParse({
      title: "Title",
      metaDescription: "Desc",
      keywords: [],
      headers: [],
      bodyMarkdown: "",
      internalLinkingSuggestions: [],
      cta: "CTA",
      estimatedReadTime: "1 min",
    });
    expect(result.success).toBe(false);
  });
});
```

### Agent functions

`src/lib/agents/__tests__/audience-analysis.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { analyzeAudience } from "../audience-analysis";
import { anthropic } from "@/lib/claude";
import type { QuizResponse } from "@/types";

vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn().mockReturnValue({ values: vi.fn() }) },
}));

const quizFixture: QuizResponse = {
  productType: "saas",
  elevatorPitch: "An AI tool for audience building",
  problemSolved: "Founders struggle to build audiences",
  uniqueAngle: "AI-powered persona generation",
  currentStage: "mvp",
  idealCustomer: "Early-stage SaaS founders",
  industryNiche: ["SaaS", "Marketing"],
  customerPainPoints: ["No audience at launch"],
  currentSolutions: ["Manual outreach"],
  budgetRange: "low",
  businessModel: "b2b",
  competitors: [],
  competitorStrengths: [],
  competitorWeaknesses: [],
  differentiators: ["AI-generated content"],
  launchTimeline: "2026-04-01T00:00:00.000Z",
  targetAudienceSize: 500,
  weeklyTimeCommitment: 5,
  preferredPlatforms: ["twitter", "linkedin"],
  contentComfortLevel: "beginner",
};

const validProfileFixture = {
  primaryPersonas: [
    {
      name: "Technical Tina",
      description: "A technical founder building her first SaaS",
      painPoints: ["No marketing experience"],
      goals: ["Launch with 500 users"],
      objections: ["AI content feels generic"],
      messagingAngle: "Focus on time savings",
    },
    {
      name: "Marketing Mike",
      description: "A solo marketer at an early startup",
      painPoints: ["Not enough content bandwidth"],
      goals: ["Scale content production"],
      objections: ["Quality concerns"],
      messagingAngle: "Emphasize customization",
    },
  ],
  psychographics: {
    values: ["efficiency", "growth"],
    motivations: ["building a successful product"],
    frustrations: ["lack of audience"],
    goals: ["product-market fit"],
  },
  demographics: {
    ageRange: [25, 40],
    locations: ["US", "Europe"],
    jobTitles: ["Founder", "CTO"],
    incomeRange: "$80k-$150k",
  },
  behavioralPatterns: {
    contentConsumption: ["Twitter threads", "blog posts"],
    purchaseDrivers: ["time savings", "ROI"],
    decisionMakingProcess: "Research-driven, peer recommendations",
  },
  keywords: ["audience building", "pre-launch"],
  hashtags: ["#buildinpublic", "#saas"],
};

describe("analyzeAudience", () => {
  it("returns validated audience profile", async () => {
    vi.mocked(anthropic.messages.create).mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(validProfileFixture) }],
      usage: { input_tokens: 500, output_tokens: 1200 },
    } as any);

    const result = await analyzeAudience(quizFixture);

    expect(result.profile.primaryPersonas).toHaveLength(2);
    expect(result.profile.primaryPersonas[0].name).toBe("Technical Tina");
    expect(result.modelUsed).toBe("claude-sonnet-4-20250514");
    expect(result.tokensUsed).toBe(1700);
  });

  it("throws when Claude returns invalid JSON", async () => {
    vi.mocked(anthropic.messages.create).mockResolvedValue({
      content: [{ type: "text", text: "I cannot generate that content." }],
      usage: { input_tokens: 100, output_tokens: 50 },
    } as any);

    await expect(analyzeAudience(quizFixture)).rejects.toThrow();
  });

  it("throws when response fails Zod validation", async () => {
    vi.mocked(anthropic.messages.create).mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({ primaryPersonas: [] }), // min 1 required
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    } as any);

    await expect(analyzeAudience(quizFixture)).rejects.toThrow();
  });
});
```

### API route handlers

`src/app/api/campaign/__tests__/route.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };
  return {
    db: {
      select: vi.fn().mockReturnValue(mockChain),
      insert: vi.fn().mockReturnValue(mockChain),
    },
  };
});

vi.mock("@/lib/db/schema", () => ({
  campaigns: {},
  campaignContent: {},
  audienceProfiles: {},
  quizResponses: {},
}));

vi.mock("@/lib/agents/campaign-strategy", () => ({
  generateCampaignStrategy: vi.fn(),
}));

vi.mock("@/lib/agents/utils", () => ({
  logAgentRun: vi.fn(),
}));

describe("GET /api/campaign", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const req = new Request("http://localhost/api/campaign");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns campaigns for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

    const mockCampaigns = [{ id: "camp_1", name: "Test Campaign" }];
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockCampaigns),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as any);

    const req = new Request("http://localhost/api/campaign");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(mockCampaigns);
    expect(json.error).toBeNull();
  });
});

describe("POST /api/campaign", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const req = new Request("http://localhost/api/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedPlatforms: ["twitter"] }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when no audience profile exists", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);

    // DB returns empty for audience profile lookup
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as any);

    const req = new Request("http://localhost/api/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedPlatforms: ["twitter"] }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("NO_PROFILE");
  });
});
```

### Custom hooks

`src/hooks/__tests__/use-campaign.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCampaignList, useCreateCampaign } from "../use-campaign";
import React from "react";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

describe("useCampaignList", () => {
  it("fetches campaigns from /api/campaign", async () => {
    const mockCampaigns = [{ id: "1", name: "Campaign A" }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockCampaigns, error: null }),
    });

    const { result } = renderHook(() => useCampaignList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCampaigns);
    expect(fetch).toHaveBeenCalledWith("/api/campaign");
  });

  it("throws on fetch error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useCampaignList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to fetch campaigns");
  });
});

describe("useCreateCampaign", () => {
  it("posts selected platforms and invalidates cache", async () => {
    const mockCampaign = { id: "new_1", name: "New Campaign" };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockCampaign, error: null }),
    });

    const { result } = renderHook(() => useCreateCampaign(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(["twitter", "linkedin"]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith("/api/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedPlatforms: ["twitter", "linkedin"] }),
    });
  });
});
```

### Component tests

`src/components/audience/__tests__/persona-card.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PersonaCard } from "../persona-card";

const mockPersona = {
  name: "Technical Tina",
  description: "A technical founder building her first SaaS product",
  painPoints: ["No marketing experience", "Limited time"],
  goals: ["Launch with 500 users"],
  objections: ["AI content feels generic"],
  messagingAngle: "Focus on time savings and automation",
};

describe("PersonaCard", () => {
  it("renders persona name and description", () => {
    render(<PersonaCard persona={mockPersona} index={0} />);

    expect(screen.getByText("Technical Tina")).toBeInTheDocument();
    expect(
      screen.getByText(/technical founder building/)
    ).toBeInTheDocument();
  });

  it("renders pain points", () => {
    render(<PersonaCard persona={mockPersona} index={0} />);

    expect(screen.getByText("No marketing experience")).toBeInTheDocument();
  });
});
```

## 6. Fixtures

Define test data at the top of test files or in shared `__fixtures__/` directories:

```
src/lib/agents/__fixtures__/quiz.ts        # quizFixture
src/lib/agents/__fixtures__/audience.ts    # audienceProfileFixture
src/lib/agents/__fixtures__/campaign.ts    # campaignStrategyFixture
```

Example fixture file:

```typescript
// src/lib/agents/__fixtures__/quiz.ts
import type { QuizResponse } from "@/types";

export const quizFixture: QuizResponse = {
  productType: "saas",
  elevatorPitch: "An AI tool for audience building",
  problemSolved: "Founders struggle to build audiences",
  uniqueAngle: "AI-powered persona generation",
  currentStage: "mvp",
  idealCustomer: "Early-stage SaaS founders",
  industryNiche: ["SaaS", "Marketing"],
  customerPainPoints: ["No audience at launch"],
  currentSolutions: ["Manual outreach"],
  budgetRange: "low",
  businessModel: "b2b",
  competitors: [],
  competitorStrengths: [],
  competitorWeaknesses: [],
  differentiators: ["AI-generated content"],
  launchTimeline: "2026-04-01T00:00:00.000Z",
  targetAudienceSize: 500,
  weeklyTimeCommitment: 5,
  preferredPlatforms: ["twitter", "linkedin"],
  contentComfortLevel: "beginner",
};
```

## 7. Running Tests

| Command | Purpose |
|---------|---------|
| `npm test` | Watch mode — re-runs on file changes |
| `npm run test:run` | Single run — use in CI |
| `npm run test:coverage` | Single run with coverage report |

## 8. What to Test

### Must test

- **Agent functions**: prompt construction, JSON extraction, Zod validation, error cases
- **Zod validation schemas**: valid input passes, invalid input fails with correct errors
- **Utility functions**: `extractJSON()`, `withRetry()`, `cn()`
- **API routes**: auth check (401 path), validation, success path, error paths
- **Custom hooks**: query key correctness, mutation invalidation
- **Components with logic**: form validation, step navigation, conditional rendering

### Do NOT test

- shadcn UI primitives (`src/components/ui/`)
- Drizzle schema definitions (tested implicitly by migrations)
- Static layouts with no logic

## 9. Rules

1. Test file naming: `{source-file}.test.ts` inside `__tests__/`
2. **Mock all external services** — never call Claude API, database, or Clerk in tests
3. Use fixtures for test data — define at top of test file or in `__fixtures__/`
4. Test the contract: inputs produce expected outputs, errors produce expected error shapes
5. Agent tests must verify Zod validation catches malformed AI output
6. API route tests must verify the 401 path (auth check)
7. **No snapshot tests** — they bitrot quickly
8. Keep each test file focused — one `describe` per function/component
