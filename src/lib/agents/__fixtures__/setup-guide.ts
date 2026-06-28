import type { SetupGuideInput, SetupGuideOutput } from "@/types";
import { audienceProfileFixture } from "./audience";

/** Raw agent output shape (pre-derivation of estimatedTotalMinutes). */
type SetupGuideFixture = Pick<SetupGuideOutput, "checklist" | "welcomeMessage">;

export const discordSetupGuideInputFixture: SetupGuideInput = {
  platform: "discord",
  communityName: "The Pre-Launch Pact",
  audienceProfile: audienceProfileFixture,
};

export const redditSetupGuideInputFixture: SetupGuideInput = {
  platform: "reddit",
  communityName: "The Pre-Launch Pact",
  audienceProfile: audienceProfileFixture,
};

/**
 * Raw agent (LLM) output for Discord. Matches `setupGuideAgentOutputSchema`
 * (checklist + welcomeMessage); the agent derives `estimatedTotalMinutes`.
 * Crafted to satisfy the structural assertions: 4+ sections, 3+ distinct
 * channel names across steps, and copyReady fields that are pasteable text.
 */
export const discordSetupGuideFixture: SetupGuideFixture = {
  checklist: [
    {
      section: "Server Name & Icon",
      steps: [
        {
          text: "Create a new Discord server and name it after your community.",
          estimatedMinutes: 3,
          copyReady: "The Pre-Launch Pact",
        },
        {
          text: "Upload a square 512x512 icon that matches your brand colors.",
          estimatedMinutes: 5,
        },
      ],
    },
    {
      section: "Channel Structure",
      steps: [
        {
          text: "Create the starter channels under an INFO and a COMMUNITY category.",
          estimatedMinutes: 8,
          copyReady:
            "#welcome\n#announcements\n#rules\n#introductions\n#general\n#build-in-public\n#wins",
        },
        {
          text: "Set #welcome, #announcements, and #rules to read-only for members.",
          estimatedMinutes: 4,
        },
      ],
    },
    {
      section: "Role Hierarchy",
      steps: [
        {
          text: "Create three roles so moderators and early members stand out.",
          estimatedMinutes: 6,
          copyReady: "Founder\nModerator\nFounding Member",
        },
      ],
    },
    {
      section: "Bot Recommendations",
      steps: [
        {
          text: "Add three free bots: MEE6 for moderation, Carl-bot for reaction roles, and Statbot for analytics.",
          estimatedMinutes: 12,
        },
      ],
    },
    {
      section: "Welcome Channel Setup",
      steps: [
        {
          text: "Pin a welcome message in #welcome that tells new members what to do first.",
          estimatedMinutes: 5,
          copyReady:
            "Welcome to The Pre-Launch Pact! Head to #introductions and tell us what you're building.",
        },
      ],
    },
  ],
  welcomeMessage:
    "Welcome to The Pre-Launch Pact! You're now part of a room full of founders building in the open before launch. Start in #introductions, share what you're working on, and drop your first win in #wins. We give first and celebrate every small step.",
};

/**
 * Raw agent (LLM) output for Reddit. Includes a subreddit name recommendation
 * (`r/...`) in at least one step's text, plus rules, flair, AutoModerator, wiki.
 */
export const redditSetupGuideFixture: SetupGuideFixture = {
  checklist: [
    {
      section: "Subreddit Name",
      steps: [
        {
          text: "Create your subreddit at r/PreLaunchPact and set a clear public description.",
          estimatedMinutes: 6,
          copyReady:
            "A community for solo founders building an audience before launch.",
        },
      ],
    },
    {
      section: "Rules Template",
      steps: [
        {
          text: "Add a starter set of community rules in the moderation tools.",
          estimatedMinutes: 10,
          copyReady:
            "1. Be helpful, not spammy.\n2. No self-promotion outside the weekly thread.\n3. Give feedback with kindness.",
        },
      ],
    },
    {
      section: "Flair Setup",
      steps: [
        {
          text: "Create post flairs so members can categorize their threads.",
          estimatedMinutes: 7,
          copyReady: "Build in Public\nFeedback Wanted\nWin\nQuestion",
        },
      ],
    },
    {
      section: "AutoModerator Basics",
      steps: [
        {
          text: "Enable AutoModerator and add a rule that removes posts from accounts under 7 days old.",
          estimatedMinutes: 12,
        },
      ],
    },
    {
      section: "Wiki Page Structure",
      steps: [
        {
          text: "Create a wiki index page linking to your rules, FAQ, and resources.",
          estimatedMinutes: 9,
        },
      ],
    },
  ],
  welcomeMessage:
    "Welcome to r/PreLaunchPact! This is a place for founders building an audience before launch. Read the rules, flair your first post, and introduce yourself in the pinned thread.",
};
