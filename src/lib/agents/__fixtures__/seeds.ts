import { audienceProfileFixture } from "./audience";
import type { SeedInput, SeedOutput } from "../conversation-seed";

export const seedInputFixture: SeedInput = {
  audienceProfile: audienceProfileFixture,
  contentPillars: [
    "The Pre-Launch Playbook",
    "Build in Public",
    "AI-Powered Marketing",
  ],
  platform: "reddit",
  count: 5,
};

export const seedOutputFixture: SeedOutput = {
  seeds: [
    {
      type: "question",
      text: "Solo founders who built a waitlist before writing code — what was the first place you got real signal from?",
      follow_up:
        "If a few people drop platforms, ask which one converted highest to actual signups vs. just followers.",
      best_time: "Tuesday 9am ET",
      rationale:
        "Targets the persona pain point 'no audience at launch time' and invites peers to share specifics, which builds the thread organically.",
    },
    {
      type: "poll",
      text: "Pre-launch builders: where do you spend the most time? A) Coding the product B) Writing content C) DMing potential users D) Doom-scrolling Twitter for ideas",
      follow_up:
        "Reply to the top vote with a follow-up: 'How many hours/week, and is it working?'",
      best_time: "Monday 11am ET",
      rationale:
        "Light, self-deprecating poll that maps directly onto the 'no time for content' frustration — easy participation = lots of comments.",
    },
    {
      type: "challenge",
      text: "Challenge: post one build-in-public update this week with an actual number — even if the number is embarrassing. Reply with what you posted.",
      follow_up:
        "Pin the most honest response and quote-reply with encouragement.",
      best_time: "Sunday evening",
      rationale:
        "Activates the Build-in-Public pillar and lowers the bar for the 'feels inauthentic posting marketing content' objection.",
    },
    {
      type: "hot_take",
      text: "Most pre-launch waitlists are vanity. If your 500 signups never replied to a single email, you don't have a community — you have a mailing list with extra steps.",
      follow_up: "Ask: 'What's a better leading indicator than waitlist size?'",
      best_time: "Wednesday 1pm ET",
      rationale:
        "Directly challenges a common belief, fits Reddit's contrarian discussion culture, and ties to the 'build a real community' goal.",
    },
    {
      type: "question",
      text: "If you could automate one part of pre-launch marketing without losing authenticity, which part would you hand off first?",
      follow_up:
        "Use the answers to validate which AI-Powered Marketing pillar themes hit hardest.",
      best_time: "Thursday 10am ET",
      rationale:
        "Pulls from the AI-Powered Marketing pillar while respecting the persona's authenticity concern — opens space for nuanced replies.",
    },
  ],
};
