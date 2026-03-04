import type { AudienceProfile } from "@/types";

export const audienceProfileFixture: AudienceProfile = {
  primaryPersonas: [
    {
      name: "Alex the Solo Founder",
      description:
        "A technical solo founder building a B2B SaaS product who is great at coding but struggles with marketing and community building. Typically in their late 20s to early 40s.",
      painPoints: [
        "No time for content creation while building product",
        "Doesnt know which platforms to prioritize",
        "Feels inauthentic posting marketing content",
      ],
      goals: [
        "Build a waitlist of 500+ before launch",
        "Establish thought leadership in their niche",
        "Create a sustainable content routine",
      ],
      objections: [
        "AI-generated content wont feel authentic",
        "Another tool to learn and manage",
        "Not sure it will work for my specific niche",
      ],
      messagingAngle:
        "Stop building in silence. Let AI handle your content strategy so you can focus on what you do best — building.",
    },
    {
      name: "Sarah the Startup Marketer",
      description:
        "An early-stage startup marketer responsible for building buzz before a product launch. She knows marketing but needs help scaling content across multiple platforms efficiently.",
      painPoints: [
        "Manually adapting content for each platform is tedious",
        "Hard to maintain consistent messaging across channels",
        "Limited budget for content tools",
      ],
      goals: [
        "Launch with a bang — 1000+ engaged followers",
        "Create a content calendar that runs on autopilot",
        "Prove ROI to founders and investors",
      ],
      objections: [
        "We already use Buffer/Hootsuite",
        "Will it integrate with our existing workflow?",
        "How is this different from ChatGPT?",
      ],
      messagingAngle:
        "From one product brief to content everywhere. Build your pre-launch audience without the busywork.",
    },
  ],
  psychographics: {
    values: ["Efficiency", "Authenticity", "Innovation", "Community", "Growth"],
    motivations: [
      "Launch successfully with an engaged audience",
      "Save time on repetitive content tasks",
      "Stand out in a crowded market",
    ],
    frustrations: [
      "Content creation takes too long",
      "Generic marketing advice doesnt apply to their niche",
      "Social media algorithms feel unpredictable",
    ],
    goals: [
      "Build pre-launch momentum",
      "Establish brand presence across platforms",
      "Convert followers into customers",
    ],
  },
  demographics: {
    ageRange: [25, 45],
    locations: ["United States", "United Kingdom", "Canada", "Western Europe"],
    jobTitles: ["Founder", "CEO", "CTO", "Head of Marketing", "Growth Lead"],
    incomeRange: "$50,000 - $150,000",
  },
  behavioralPatterns: {
    contentConsumption: [
      "Twitter/X threads",
      "LinkedIn posts",
      "Reddit discussions",
      "Indie Hackers forums",
      "YouTube tutorials",
    ],
    purchaseDrivers: [
      "Time savings",
      "Proven results from similar founders",
      "Easy onboarding",
      "Free trial availability",
    ],
    decisionMakingProcess:
      "Research-driven: reads reviews, tries free tier, compares with alternatives, asks peers in Slack/Discord communities before committing.",
  },
  keywords: [
    "pre-launch marketing",
    "community building",
    "audience building",
    "content strategy",
    "startup marketing",
    "launch strategy",
    "social media automation",
    "founder marketing",
    "build in public",
    "indie hacker",
    "SaaS marketing",
    "content calendar",
  ],
  hashtags: [
    "#buildinpublic",
    "#indiehacker",
    "#startuplife",
    "#saas",
    "#founderlife",
    "#communitybuilding",
    "#prelaunch",
    "#growthhacking",
    "#contentmarketing",
    "#launchday",
    "#audiencebuilding",
    "#startupmarketing",
  ],
};
