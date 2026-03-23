import type { QuizResponse } from "@/types";

export const quizFixture: QuizResponse = {
  // Step 1: Your Product
  productType: "saas",
  elevatorPitch:
    "An AI-powered tool that helps founders build communities before launching their product.",
  problemSolved:
    "Founders launch products without an audience, leading to failed launches and wasted effort.",
  currentStage: "mvp",
  // Step 2: Your Audience
  idealCustomer:
    "Solo founders and small startup teams building B2B SaaS products who need to build an audience before launch.",
  industryNiche: ["SaaS", "Developer Tools", "Community Building"],
  preferredPlatforms: ["twitter", "linkedin", "reddit"],
  businessModel: "b2c",
  budgetRange: "low",
  // Step 3: Your Goals
  primaryGoal: "pre-launch",
  launchTimeline: "2026-06-01T00:00:00.000Z",
  weeklyTimeCommitment: 5,
  contentComfortLevel: "intermediate",
};
