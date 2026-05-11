import type { AudienceProfile } from "@/types";
import type { ColdOutreachInput } from "../cold-outreach";

export const coldOutreachAudienceFixture: AudienceProfile = {
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

export const coldOutreachInputFixture: ColdOutreachInput = {
  prospect: { handle: "@indiebuilder", platform: "twitter", source: "manual" },
  product: {
    name: "Coon",
    description: "AI community-building copilot for pre-launch founders",
    targetAudience: "Solo SaaS founders building in public",
  },
  audienceProfile: coldOutreachAudienceFixture,
  communityName: "Indie Builders",
};

export const coldOutreachOutputFixture = {
  variants: [
    {
      message:
        "Saw your thread on shipping solo — the part about reply triage hit home. Curious how you're handling it now?",
      approach: "direct",
      followUp:
        "Hey, no rush — wanted to circle back in case the timing is better now.",
    },
    {
      message:
        "Stole your weekly retro idea and wrote up a 5-min template. Sharing it back in case it saves you time on your next one.",
      approach: "value_first",
      followUp:
        "Did the retro template help at all? Happy to send the second one I use too.",
    },
  ],
};

// Long output to exercise char-limit slicing on every string field.
export const longColdOutreachOutputFixture = {
  variants: [
    {
      message: "x".repeat(600),
      approach: "direct",
      followUp: "y".repeat(600),
    },
    {
      message: "z".repeat(600),
      approach: "value_first",
      followUp: "w".repeat(600),
    },
  ],
};

// Fixture used to test the approach-uniqueness guard.
export const duplicateApproachOutputFixture = {
  variants: [
    {
      message: "First direct opener.",
      approach: "direct",
      followUp: "First direct follow-up.",
    },
    {
      message: "Second direct opener.",
      approach: "direct",
      followUp: "Second direct follow-up.",
    },
  ],
};
