// Valid platform-content output fixtures, one per generator.
// Each matches the corresponding Zod schema in @/lib/validations/campaign.
import type {
  BlogContent,
  DiscordContent,
  EmailNewsletterContent,
  InstagramContent,
  LinkedInContent,
  PinterestContent,
  RedditContent,
  ThreadsContent,
  TikTokContent,
  TwitterContent,
  YouTubeContent,
} from "@/types";

export const blogOutputFixture: BlogContent = {
  title: "Build Your Audience Before You Launch",
  metaDescription: "A practical pre-launch playbook for founders.",
  keywords: ["pre-launch", "community building", "build in public"],
  headers: [
    { level: 2, text: "Why Pre-Launch Matters" },
    { level: 3, text: "Finding Your First 100" },
  ],
  bodyMarkdown: "## Why Pre-Launch Matters\n\nMost products fail in silence...",
  internalLinkingSuggestions: ["The pre-launch checklist", "Persona guide"],
  cta: "Join the waitlist today.",
  estimatedReadTime: "7 min read",
};

export const discordOutputFixture: DiscordContent = {
  introChannelMessage: "Welcome, builders! Glad you're here.",
  generalChannelMessage: "What are you building this week?",
  showcaseChannelMessage: "Drop your latest win in the thread.",
  engagementPrompts: [
    "What's your biggest pre-launch fear?",
    "Share one thing you shipped today.",
    "Who's your ideal first customer?",
  ],
};

export const emailOutputFixture: EmailNewsletterContent = {
  subjectLine: "Your first 500 customers are waiting",
  previewText: "Stop building in silence — start the conversation today.",
  bodySections: [
    { heading: "The hook", content: "Most launches fail before day one." },
    { heading: "The fix", content: "Build your audience first." },
  ],
  ctaButtons: [
    { text: "Get Early Access", description: "Leads to the waitlist signup." },
  ],
  segmentationSuggestions: ["Solo founders", "Early-stage marketers"],
};

export const instagramOutputFixture: InstagramContent = {
  carouselSlides: [
    {
      slideNumber: 1,
      text: "Stop building in silence.",
      imageDescription: "Bold text on dark gradient.",
      altText: "Slide reading stop building in silence",
    },
  ],
  caption:
    "Your next 500 customers are already online.\n\nHere's how to find them.",
  hashtags: ["#buildinpublic", "#indiehacker"],
  postingTimeSuggestion: "Tuesday 11am",
  contentType: "carousel",
};

export const linkedinOutputFixture: LinkedInContent = {
  post: "I built an audience of 500 before writing a line of code.\n\nHere's how.",
  articleOutline: {
    title: "The Pre-Launch Playbook",
    sections: [
      "Why audience-first wins",
      "Finding your people",
      "Staying consistent",
    ],
  },
  hashtags: ["#buildinpublic", "#startups", "#founders"],
  toneGuidance: "Share as a personal founder story.",
};

export const pinterestOutputFixture: PinterestContent = {
  pinTitle: "Pre-Launch Marketing Checklist for Founders",
  description: "Build your launch-day audience with this step-by-step guide.",
  boardSuggestion: "Startup Marketing Tips",
  imageDescription: "Vertical 2:3 pin with bold checklist overlay.",
  keywords: ["pre-launch marketing", "startup checklist", "audience building"],
  altText: "Checklist graphic for pre-launch marketing",
};

export const redditOutputFixture: RedditContent = {
  postTitle: "How I validated my SaaS idea with 100 conversations",
  postBody: "I spent a month talking to founders before writing any code...",
  suggestedSubreddits: ["r/startups", "r/SaaS", "r/Entrepreneur"],
  commentEngagementStrategy: [
    "If asked about tools, share the framework not the product.",
    "Thank people who share their own experience.",
  ],
  flairSuggestion: "Case Study",
};

export const threadsOutputFixture: ThreadsContent = {
  postText: "Hot take: your launch day audience should already exist.",
  conversationStarters: [
    "What's stopping you from building in public?",
    "Reply with your pre-launch follower count.",
  ],
  replyStrategy: [
    "When someone disagrees, ask what they tried.",
    "Amplify the best community replies.",
  ],
};

export const tiktokOutputFixture: TikTokContent = {
  hook: "POV: you launched and nobody showed up.",
  scriptBody: "Here's the 3-step fix I wish I knew sooner...",
  cta: "Follow for the full pre-launch playbook.",
  shotList: [
    {
      shotNumber: 1,
      description: "Talking head close-up delivering the hook.",
      duration: "3 seconds",
      angle: "talking head close-up",
    },
  ],
  musicSuggestions: ["Upbeat lo-fi", "Trending motivational"],
  trendingHashtags: ["#buildinpublic", "#startup", "#founderlife"],
  caption: "Don't launch to crickets.",
};

export const twitterOutputFixture: TwitterContent = {
  tweets: [
    "Your next 500 customers are already online. Go find them.",
    "Build in public > build in silence.",
  ],
  threadSeparated: [
    "1/ Most products fail because nobody knows they exist.",
    "2/ The fix: build your audience before launch.",
    "3/ Start one conversation a day.",
  ],
  quoteTweetSuggestions: ["The best product with no audience still loses."],
  replyHooks: ["What's your pre-launch follower count?"],
  hashtags: ["#buildinpublic", "#indiehacker"],
};

export const youtubeOutputFixture: YouTubeContent = {
  title: "Build Your Launch Audience in 30 Days",
  description: "Timestamps:\n0:00 Intro\n0:30 Why pre-launch matters",
  tags: ["pre-launch", "startup marketing", "build in public"],
  thumbnailConcept: "Founder pointing at '500 customers' text overlay.",
  script: {
    introHook: "If you launch with no audience, you've already lost.",
    bodySegments: [
      {
        segmentTitle: "Why pre-launch matters",
        content: "Most founders build in silence and pay for it...",
        timestamp: "0:30",
      },
    ],
    cta: "Subscribe for the full playbook.",
    outro: "Next video: finding your first 100 fans.",
  },
};
