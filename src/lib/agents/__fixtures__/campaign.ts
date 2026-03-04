import type { CampaignStrategy } from "@/types";

export const campaignStrategyFixture: CampaignStrategy = {
  campaignName: "Build Before You Launch",
  theme:
    "Show founders they dont have to build alone — start the conversation before the product is ready.",
  goal: "Build a waitlist of 500 engaged potential users across Twitter, LinkedIn, and Reddit before product launch.",
  targetOutcome:
    "500 waitlist signups and 2,000 combined social followers in 4 weeks.",
  timelineWeeks: 4,
  messagingFramework: {
    coreMessage:
      "Your next 500 customers are already online. Community Builder helps you find and engage them before launch day.",
    supportingMessages: [
      "Stop building in silence — start building in public.",
      "AI-powered persona insights so you know exactly who to talk to.",
      "One quiz, endless content — let AI handle the strategy.",
    ],
    toneGuidelines:
      "Conversational, empowering, founder-to-founder. Avoid corporate jargon. Be direct and actionable.",
    keyPhrases: [
      "build before you launch",
      "pre-launch community",
      "audience-first approach",
      "AI-powered personas",
    ],
    avoidPhrases: [
      "growth hacking",
      "go viral",
      "guaranteed results",
      "game-changer",
    ],
  },
  platformAllocations: [
    {
      platform: "twitter",
      role: "primary discovery",
      contentFocus:
        "Short-form insights, build-in-public updates, engagement threads",
      frequencySuggestion: "5x per week",
      priorityOrder: 1,
    },
    {
      platform: "linkedin",
      role: "authority building",
      contentFocus:
        "Long-form founder stories, industry insights, professional credibility",
      frequencySuggestion: "3x per week",
      priorityOrder: 2,
    },
    {
      platform: "reddit",
      role: "community engagement",
      contentFocus:
        "Value-first discussions in r/startups, r/SaaS, r/Entrepreneur",
      frequencySuggestion: "2x per week",
      priorityOrder: 3,
    },
  ],
  contentPillars: [
    {
      theme: "The Pre-Launch Playbook",
      description:
        "Actionable tips and frameworks for building an audience before product launch.",
      sampleTopics: [
        "5 things I wish I knew before launching my last product",
        "How to validate your idea with 100 conversations",
        "The pre-launch checklist every founder needs",
      ],
      targetedPainPoint: "No audience at launch time",
    },
    {
      theme: "Build in Public",
      description:
        "Transparent updates about the building process to attract like-minded founders.",
      sampleTopics: [
        "Week 1 update: from idea to first prototype",
        "Our biggest mistake so far (and how we fixed it)",
        "Revenue numbers: month 1 transparency report",
      ],
      targetedPainPoint: "Feels inauthentic posting marketing content",
    },
    {
      theme: "AI-Powered Marketing",
      description:
        "How AI is changing the way founders approach content and community building.",
      sampleTopics: [
        "I used AI to find my ideal customer — heres what happened",
        "AI vs. human content: a blind test with real users",
        "The future of pre-launch marketing is AI-assisted",
      ],
      targetedPainPoint: "Content creation is time-consuming",
    },
  ],
  audienceHooks: [
    "Most products fail because nobody knows they exist.",
    "What if your launch day audience was already waiting for you?",
    "I built an audience of 500 before writing a single line of code.",
    "Stop. Building. In. Silence.",
    "The best product with zero audience loses to the okay product with a community.",
  ],
};
