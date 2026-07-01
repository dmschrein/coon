import type { RulesInput, RulesOutput } from "@/types";

export const rulesInputFixture: RulesInput = {
  communityName: "Pixel Forge",
  niche: "indie game development",
  platform: "discord",
  tone: "professional",
  existingValues: ["Build in public", "Help first"],
};

// 7 rules — all positively framed, niche-specific, with a concrete example
// violation and enforcement note. Within the 6–8 rule requirement.
export const rulesOutputFixture: RulesOutput = {
  rules: [
    {
      title: "Share your devlogs openly",
      description:
        "Post screenshots, prototypes, and post-mortems from your indie game so the community can learn from real work in progress.",
      exampleViolation:
        "Lurking for months and asking for finished assets without ever sharing your own project.",
      enforcement: "A moderator will nudge you to introduce your project.",
    },
    {
      title: "Credit the artists and tools you build with",
      description:
        "Name the asset packs, engines, and collaborators behind your indie game so creators get recognized.",
      exampleViolation:
        "Posting a sprite sheet ripped from another dev's game as your own.",
      enforcement: "Uncredited work is hidden until attribution is added.",
    },
    {
      title: "Keep playtest feedback constructive",
      description:
        "When you critique someone's build, point at the mechanic and suggest a fix instead of dunking on the developer.",
      exampleViolation:
        "Replying 'this game is trash' to a first-time dev's demo with no specifics.",
      enforcement: "Non-actionable pile-ons are removed by a moderator.",
    },
    {
      title: "Post promos in the self-promo channel",
      description:
        "Drop launch announcements and wishlist links for your indie game in #showcase so other channels stay on-topic.",
      exampleViolation:
        "Dropping your itch.io link into every unrelated game-design thread.",
      enforcement: "Misplaced promos are moved to #showcase.",
    },
    {
      title: "Welcome newcomers to game dev",
      description:
        "Answer beginner questions about engines and pipelines with patience — every shipped game started at zero.",
      exampleViolation:
        "Telling a beginner to 'just read the docs' and mocking their question.",
      enforcement: "Repeated gatekeeping leads to a warning.",
    },
    {
      title: "Keep discussion focused on making games",
      description:
        "Steer threads toward design, code, art, and shipping rather than off-topic platform drama.",
      exampleViolation:
        "Turning the #engine-help channel into a political argument.",
      enforcement: "Off-topic threads are locked by a moderator.",
    },
    {
      title: "Respect each creator's intellectual property",
      description:
        "Ask before reusing another member's mechanics, art, or code from their indie game.",
      exampleViolation:
        "Shipping a clone of a community member's prototype without asking.",
      enforcement: "IP disputes are escalated to the moderation team.",
    },
  ],
};
