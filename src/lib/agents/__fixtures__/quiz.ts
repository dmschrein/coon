import type { QuizResponse } from "@/types";

export const quizFixture: QuizResponse = {
  productType: "saas",
  elevatorPitch:
    "An AI-powered tool that helps founders build communities before launching their product.",
  problemSolved:
    "Founders launch products without an audience, leading to failed launches and wasted effort.",
  uniqueAngle:
    "Uses AI to generate personas and platform-specific content strategies tailored to pre-launch goals.",
  currentStage: "mvp",
  idealCustomer:
    "Solo founders and small startup teams building B2B SaaS products who need to build an audience before launch.",
  industryNiche: ["SaaS", "Developer Tools", "Community Building"],
  customerPainPoints: [
    "No audience at launch time",
    "Dont know where to post or what to say",
    "Content creation is time-consuming",
  ],
  currentSolutions: [
    "Manual social media posting",
    "Hiring freelance content writers",
    "Generic marketing templates",
  ],
  budgetRange: "low",
  businessModel: "b2c",
  competitors: [
    { name: "Buffer", url: "https://buffer.com" },
    { name: "Hootsuite", url: "https://hootsuite.com" },
  ],
  competitorStrengths: [
    "Established brand",
    "Large user base",
    "Multi-platform scheduling",
  ],
  competitorWeaknesses: [
    "No AI persona generation",
    "Not focused on pre-launch",
    "Generic content suggestions",
  ],
  differentiators: [
    "AI-generated audience personas from product data",
    "Pre-launch focused strategy",
    "Platform-specific content generation",
  ],
  launchTimeline: "2026-06-01T00:00:00.000Z",
  targetAudienceSize: 1000,
  weeklyTimeCommitment: 5,
  preferredPlatforms: ["twitter", "linkedin", "reddit"],
  contentComfortLevel: "intermediate",
};
