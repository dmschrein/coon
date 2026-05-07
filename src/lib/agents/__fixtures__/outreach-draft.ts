export const outreachDraftFixture = {
  message:
    "Hey @new_friend! Just spotted you in the comments — welcome to the community. What brought you here?",
  tone: "warm",
};

export const outreachInputFixture = {
  triggerReason: "new_member",
  memberHandle: "@new_friend",
  platform: "twitter",
  communityName: "Indie Builders",
  audienceProfile: "Personas: solo founders shipping SaaS",
  templateHint: "warm welcome",
};

export const truncatedOutreachFixture = {
  message: "x".repeat(500),
  tone: "warm",
};
