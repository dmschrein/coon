export const replyDraftFixture = {
  drafts: [
    {
      text: "Thanks so much for sharing your experience! It's great to hear that the onboarding flow worked well for you. We put a lot of thought into making it smooth.",
      tone: "affirming",
      rationale:
        "Validates the user's positive feedback and builds goodwill by acknowledging their experience.",
    },
    {
      text: "Really appreciate the feedback! What part of the onboarding resonated most with you? We're always looking to double down on what works.",
      tone: "curious",
      rationale:
        "Deepens the conversation by asking a follow-up question that can reveal insights about what users value.",
    },
    {
      text: "Glad you liked it! Pro tip: if you check the settings page, there's an advanced mode that unlocks even more customization options. Let me know if you have questions!",
      tone: "value-adding",
      rationale:
        "Provides actionable value beyond just acknowledging the message, increasing engagement and retention.",
    },
  ],
};

export const replyDraftInputFixture = {
  originalPost:
    "Just launched our new onboarding flow! Check it out and let us know what you think.",
  incomingMessage:
    "This is amazing! The onboarding was so smooth. Love the step-by-step approach.",
  platform: "twitter",
  authorHandle: "@happy_user",
};

export const twitterReplyDraftFixture = {
  drafts: [
    {
      text: "Thanks for the kind words! Means a lot.",
      tone: "affirming",
      rationale: "Short and warm for Twitter's character limit.",
    },
    {
      text: "What was your favorite part of the flow?",
      tone: "curious",
      rationale: "Encourages continued conversation in a concise way.",
    },
    {
      text: "Try the advanced mode in settings for more!",
      tone: "value-adding",
      rationale: "Directs user to explore more features.",
    },
  ],
};
