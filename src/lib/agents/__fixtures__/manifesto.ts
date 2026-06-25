import type { ManifestoInput, ManifestoOutput } from "@/types";
import { quizFixture } from "./quiz";

export const manifestoInputFixture: ManifestoInput = {
  elevatorPitch: quizFixture.elevatorPitch,
  problemSolved: quizFixture.problemSolved,
  idealCustomer: quizFixture.idealCustomer,
  industryNiche: quizFixture.industryNiche,
  brandVoice: "Direct, empowering, zero fluff",
};

// ~177 words — within the 150–250 word requirement.
const invitationLetter = [
  "Hey there,",
  "I'm building something I wish existed when I started out alone, staring at a blank screen and wondering if anyone else felt the same way. This community is my answer to that loneliness. It's a place for founders who are tired of shouting into the void and ready to build alongside people who actually understand the grind.",
  "When I launched my first product to silence, I realized the problem was never the product. It was that I had no one in my corner. So I'm gathering the people I needed back then: builders who share openly, celebrate small wins, and tell each other the hard truths with kindness.",
  "If you join, you won't find gurus selling shortcuts. You'll find peers trading real lessons, honest feedback, and the occasional 2am pep talk. We grow by giving first, asking second, and showing up consistently.",
  "I can't promise overnight success. I can promise you won't be alone anymore. Come build with us, bring your messy work-in-progress, and let's make something that matters together.",
  "With gratitude,\nA fellow founder",
].join("\n\n");

export const manifestoOutputFixture: ManifestoOutput = {
  nameSuggestions: [
    "The Pre-Launch Pact",
    "Founders in the Open",
    "Build Before Launch",
  ],
  mission:
    "To help solo founders build a real audience before launch, so no great product ships into silence.",
  whoFor:
    "Solo founders and small teams building B2B SaaS who want to grow a community before they have a product to sell.",
  whoNotFor:
    "Growth hackers chasing vanity metrics or anyone looking for overnight shortcuts instead of genuine relationships.",
  values: [
    {
      name: "Build in Public",
      description: "Share the messy middle, not just the highlight reel.",
    },
    {
      name: "Give First",
      description: "Lead with help; trust that generosity compounds over time.",
    },
    {
      name: "Radical Honesty",
      description: "Offer real feedback with kindness, even when it stings.",
    },
    {
      name: "Show Up",
      description: "Consistency beats intensity — small steps, taken daily.",
    },
    {
      name: "Celebrate Wins",
      description: "Every shipped feature and first customer deserves a cheer.",
    },
  ],
  invitationLetter,
};
