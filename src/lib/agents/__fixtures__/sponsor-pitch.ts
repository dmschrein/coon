import type { AudienceProfile } from "@/types";
import type { PitchInput } from "../sponsor-pitch";

export const sponsorPitchAudienceFixture: AudienceProfile = {
  primaryPersonas: [
    {
      name: "Solo Founder",
      description:
        "Technical solo founder shipping a B2B SaaS, strong on code and weak on marketing.",
      painPoints: ["lonely building", "no marketing time", "spam-fatigued"],
      goals: ["first 100 users", "validated PMF", "calm pipeline"],
      objections: ["too expensive", "yet another tool"],
      messagingAngle: "Save time on community building",
    },
  ],
  psychographics: {
    values: ["independence", "craft", "honesty"],
    motivations: ["financial freedom", "ship something real"],
    frustrations: ["paid ads dont work", "cold outreach feels gross"],
    goals: ["sustainable revenue"],
  },
  demographics: {
    ageRange: [25, 40],
    locations: ["United States", "Western Europe"],
    jobTitles: ["Founder", "Indie Hacker"],
  },
  behavioralPatterns: {
    contentConsumption: ["Twitter threads", "indiehackers.com", "newsletters"],
    purchaseDrivers: ["peer recommendation", "free trial"],
    decisionMakingProcess: "Quick, trial-driven, peer-validated.",
  },
  keywords: ["indie hacker", "bootstrapped", "saas", "build in public"],
  hashtags: ["#buildinpublic", "#indiehacker"],
};

export const sponsorPitchInputFixture: PitchInput = {
  sponsor: {
    companyName: "DevTools Inc",
    contactName: "Jane Buyer",
    deliverables: "1 sponsored post + 1 newsletter mention",
  },
  product: {
    name: "Coon",
    description: "AI community-building copilot for pre-launch founders",
  },
  audienceProfile: sponsorPitchAudienceFixture,
  audienceMetrics: {
    memberCount: 1247,
    engagementRate: 0.18,
    primaryPlatforms: ["twitter", "linkedin"],
  },
  communityName: "Indie Builders",
};

// Body length is 30-60 words and contains the literal "1247" — happy path.
export const sponsorPitchOutputFixture = {
  subject: "Sponsor 1,247 indie founders building in public",
  body: "Hi Jane — quick note about Indie Builders. We're 1247 solo SaaS founders shipping in public, with healthy engagement on Twitter and LinkedIn. DevTools Inc would land in front of buyers actively shopping for tools they trust peer-to-peer. Sponsored post plus newsletter mention; happy to share past metrics.",
  followUp:
    "No rush — wanted to circle back in case the timing is better. Happy to drop the past-issue metrics if useful.",
};

// >300 words to exercise truncation. Includes "1247" so the grounding guard passes.
export const longSponsorPitchOutputFixture = {
  subject: "Sponsor 1,247 indie founders building in public",
  body:
    "We have 1247 members. " +
    Array.from({ length: 320 }, () => "word").join(" "),
  followUp: "Following up next week.",
};

// Missing the memberCount number — used to test the grounding guard throws.
export const missingCountSponsorPitchOutputFixture = {
  subject: "Sponsor an engaged community",
  body: "Hi Jane — Indie Builders is a curated audience of solo SaaS founders. DevTools Inc would land in front of buyers shopping for trusted dev tooling. Happy to share metrics.",
  followUp: "No rush — happy to circle back.",
};
