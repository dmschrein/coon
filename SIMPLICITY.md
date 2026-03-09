# Simplicity Playbook — Community Builder

This document applies the "Playbook for Simple Apps" to Community Builder. It is a living audit
that tracks friction points, simplification decisions, and iteration history. Review and update
this file at every stage: prototype, pre-release, and post-release.

---

## The 3 Pillars

### 1. Simplicity as a "Premium Feature"

UX and frictionless design are first-class priorities — not side effects. Complexity is expensive.
Every feature must earn its place by reducing the user's mental load, not adding to it.

### 2. Triple-Tier Iteration Loop

Never design "simple" in one pass. Evaluate at three distinct stages:

- **Prototype** — Catch complexity before writing code. Ask: "Is this the minimum path to value?"
- **Pre-Release** — Pause before launch. If the flow doesn't feel obvious, postpone and simplify.
- **Post-Release** — Gather real friction signals. Return to the drawing board.

### 3. Continuous Product Auditing

As features are added, complexity accumulates invisibly. Deliberately schedule simplification
reviews. The goal: version 10.0 feels as easy as version 1.0.

---

## Current Stage: Pre-Release (v0.1.0)

This is the right time to apply Pillar 2 — pause, assess, and fix the flow before launch.

---

## Friction Point Audit

### Status Legend

- `OPEN` — Not yet addressed
- `IN PROGRESS` — Being worked on
- `RESOLVED` — Fixed, with notes on how

---

### Critical Friction Points

| #   | Friction Point                                                                              | Location                                                      | Impact                                      | Status |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- | ------ |
| 1   | 4-step quiz with 20+ required fields, no save/resume                                        | `src/components/quiz/quiz-form.tsx`, step components          | High abandonment during onboarding          | OPEN   |
| 2   | After quiz, user lands on empty "Generate Profile" state — no success moment                | `quiz-form.tsx` (hardcoded redirect to `/dashboard/audience`) | Confusion; user unsure if quiz worked       | OPEN   |
| 3   | Audience profile generation is not automatic — user must find and click a button            | `src/app/dashboard/audience/page.tsx`                         | Extra unnecessary step                      | OPEN   |
| 4   | Content generation silently gated behind audience profile (disabled button, no explanation) | `src/app/dashboard/content/page.tsx`                          | Users hit dead ends with no guidance        | OPEN   |
| 5   | 2+ minute generation waits with only a spinner — no progress feedback                       | `src/app/api/content/route.ts` (120s timeout)                 | App appears frozen/broken                   | OPEN   |
| 6   | 5 differently-named "Generate" buttons scattered across 4 pages with no connecting flow     | Multiple dashboard pages                                      | Inconsistent mental model, decision fatigue | OPEN   |

### Secondary Friction Points

| #   | Friction Point                                                                                | Location                                       | Impact                                             | Status |
| --- | --------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- | ------ |
| 7   | Tag-based inputs for niches, pain points, solutions — no autocomplete or examples             | `src/components/quiz/target-customer-step.tsx` | Users unsure how to fill inputs; poor data quality | OPEN   |
| 8   | Campaign creation requires opening a modal + checking 11 platform checkboxes                  | `src/app/dashboard/campaign/page.tsx`          | Feature feels heavyweight; low discoverability     | OPEN   |
| 9   | Content grid mixes all platforms with no visual grouping — becomes unusable at 20+ items      | `src/app/dashboard/content/page.tsx`           | Content is hard to find and use after generation   | OPEN   |
| 10  | Sidebar includes "Quiz" link for logged-in users — no warning that retaking resets everything | `src/components/dashboard/sidebar.tsx`         | Users accidentally restart their workflow          | OPEN   |

---

## Simplification Roadmap

Ordered by impact-to-effort ratio. Address these before launch.

### Priority 1 — Reduce Quiz to Minimum Viable Input

**Problem:** 20+ fields across 4 steps overwhelms new users before they've seen any value.
**Target:** 2 steps, 8-10 fields maximum.

- Keep: product elevator pitch, problem solved, ideal customer description, preferred platforms
- Move to post-onboarding settings: competitor analysis, community goals, launch timeline
- Replace tag inputs with plain textarea; parse tags server-side from comma-separated text
- Add placeholder examples in every field so users know what "good" looks like
  **Files:** `quiz-form.tsx`, step components, `src/lib/validations/quiz.ts`, `POST /api/quiz/responses`

### Priority 2 — Remove the Empty State After Quiz

**Problem:** User completes quiz and immediately faces a blank "No profile yet" screen.
**Target:** Quiz submission automatically triggers audience profile generation.

- After `POST /api/quiz/responses` succeeds, immediately call `POST /api/audience-profile`
- Redirect to a dedicated "generating your profile..." loading page with step-by-step progress text
- User arrives at a results page, not an action page
  **Files:** `quiz-form.tsx`, `dashboard/audience/page.tsx`, quiz API route

### Priority 3 — Add Generation Progress Feedback

**Problem:** AI generation takes 2+ minutes with no feedback — users think the app is broken.
**Target:** Show named steps and elapsed time during generation.

- Add progress steps: "Analyzing your inputs → Building audience personas → Drafting content..."
- Show elapsed time ("30s elapsed")
- Add a cancel button
  **Files:** `src/app/api/content/route.ts`, content/audience generation UI components

### Priority 4 — Unify the Generation Flow

**Problem:** Users must manually navigate between 4 pages to complete the Audience → Content flow.
**Target:** A single guided flow that auto-advances through each generation step.

- After audience profile is ready, show an inline CTA: "Next: Generate content for your audience"
- Content generation should start automatically or with a single clear action
- Remove redundant generate/regenerate buttons; consolidate to one action per page
  **Files:** `dashboard/audience/page.tsx`, `dashboard/content/page.tsx`

### Priority 5 — Make Campaigns Discoverable

**Problem:** Campaigns are hidden behind a nav link and require too many clicks to create.
**Target:** Surface campaigns as the natural next step after content generation.

- After content is generated, show a prominent CTA: "Ready to plan your launch? Build a campaign."
- Pre-select platforms from quiz answers as defaults; user can deselect, not select from scratch
- Remove the modal dialog; use an inline form or dedicated page
  **Files:** `dashboard/content/page.tsx`, `dashboard/campaign/page.tsx`

---

## Iteration Log

| Date | Change                  | Stage       | Notes                                                 |
| ---- | ----------------------- | ----------- | ----------------------------------------------------- |
| —    | Initial audit completed | Pre-Release | 10 friction points identified before any user testing |

---

## Pre-Launch Checklist (from Pillar 2)

Before going live, verify:

- [ ] New user can complete onboarding in under 5 minutes
- [ ] First AI-generated output is visible without any "generate" button clicks
- [ ] No wait state exceeds 30 seconds without meaningful progress feedback
- [ ] Every "disabled" state has a visible explanation of what to do next
- [ ] A first-time user never needs to read documentation to understand the next step
- [ ] Quiz can be completed on mobile without horizontal scrolling
