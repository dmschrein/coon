import type { OnboardingInput } from "@/types";
import { audienceProfileFixture } from "./audience";

/**
 * Input passed to `generateOnboardingSequence`.
 */
export const onboardingInputFixture: OnboardingInput = {
  audienceProfile: audienceProfileFixture,
  communityName: "Builders Guild",
  productPitch: "AI that builds your community before you launch.",
};

/**
 * Raw 5-step draft as the model is expected to return it (before the agent
 * assigns canonical trigger timings + step numbers). Order matters: the agent
 * maps these to immediate → day1 → day3 → day7 → day14.
 */
export const onboardingDraftFixture = {
  steps: [
    {
      channel: "email",
      subject: "Welcome to Builders Guild — your first quick win",
      content:
        "You're in! Here's a 2-minute action to get value today: introduce yourself in #intros.",
    },
    {
      channel: "email",
      subject: "What are you building right now?",
      content:
        "Reply and tell us what you're working on — the community loves a good build-in-public story.",
    },
    {
      channel: "email",
      subject: "The ritual that keeps members shipping",
      content:
        "Every week we run Ship Friday. Here's how to join and why it works.",
    },
    {
      channel: "email",
      subject: "Share your first win with the guild",
      content:
        "Post a small win this week. Contributing early is the #1 predictor of sticking around.",
    },
    {
      channel: "email",
      subject: "See what members shipped — and grab your invite codes",
      content:
        "Look at what the guild shipped this month. Upgrade or refer a friend to unlock more.",
    },
  ],
};
