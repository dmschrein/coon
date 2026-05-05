import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").unique().notNull(),
  name: text("name"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Quiz Responses ──────────────────────────────────────────────────────────
export const quizResponses = pgTable("quiz_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  responseData: jsonb("response_data").notNull(),
  version: integer("version").default(1),
  completedAt: timestamp("completed_at").defaultNow(),
});

// ─── Audience Profiles ───────────────────────────────────────────────────────
export const audienceProfiles = pgTable("audience_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quizResponseId: uuid("quiz_response_id").references(() => quizResponses.id),
  profileData: jsonb("profile_data").notNull(),
  confidenceLevel: text("confidence_level").default("quiz_based"),
  analyticsData: jsonb("analytics_data"),
  isActive: boolean("is_active").default(true),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// ─── Content Items ───────────────────────────────────────────────────────────
export const contentItems = pgTable("content_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  audienceProfileId: uuid("audience_profile_id").references(
    () => audienceProfiles.id
  ),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  pillar: text("pillar"),
  title: text("title"),
  body: text("body").notNull(),
  hashtags: text("hashtags").array(),
  cta: text("cta"),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Campaigns ──────────────────────────────────────────────────────────────
export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    audienceProfileId: uuid("audience_profile_id").references(
      () => audienceProfiles.id
    ),
    quizResponseId: uuid("quiz_response_id").references(() => quizResponses.id),
    name: text("name"),
    goal: text("goal"),
    topic: text("topic"),
    duration: text("duration"),
    frequencyConfig: jsonb("frequency_config"),
    status: text("status").notNull().default("draft"),
    strategyData: jsonb("strategy_data"),
    strategySummary: text("strategy_summary"),
    contentPillars: jsonb("content_pillars"),
    calendarData: jsonb("calendar_data"),
    selectedPlatforms: text("selected_platforms").array(),
    completedPlatforms: text("completed_platforms").array().default([]),
    totalTokensUsed: integer("total_tokens_used").default(0),
    cohesionResult: jsonb("cohesion_result"),
    cohesionContentHash: text("cohesion_content_hash"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("campaigns_user_status_idx").on(table.userId, table.status)]
);

// ─── Campaign Content ───────────────────────────────────────────────────────
export const campaignContent = pgTable(
  "campaign_content",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    pillar: text("pillar"),
    title: text("title"),
    body: text("body"),
    hashtags: text("hashtags").array(),
    mediaSuggestions: jsonb("media_suggestions"),
    targetCommunity: text("target_community"),
    scheduledFor: timestamp("scheduled_for"),
    postedAt: timestamp("posted_at"),
    aiConfidenceScore: integer("ai_confidence_score"),
    externalPostId: text("external_post_id"),
    externalPostUrl: text("external_post_url"),
    lastEngagementFetch: timestamp("last_engagement_fetch"),
    approvalStatus: text("approval_status").default("pending_review"),
    status: text("status").notNull().default("pending"),
    contentData: jsonb("content_data"),
    tokensUsed: integer("tokens_used"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("campaign_content_campaign_idx").on(table.campaignId),
    index("campaign_content_campaign_status_idx").on(
      table.campaignId,
      table.status
    ),
    index("campaign_content_scheduled_idx").on(table.scheduledFor),
  ]
);

// ─── Campaign Calendar Entries ──────────────────────────────────────────────
export const campaignCalendarEntries = pgTable(
  "campaign_calendar_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    scheduledDate: timestamp("scheduled_date"),
    platform: text("platform").notNull(),
    contentType: text("content_type").notNull(),
    title: text("title").notNull(),
    postingTime: text("posting_time"),
    pillar: text("pillar"),
    notes: text("notes"),
    campaignContentId: uuid("campaign_content_id").references(
      () => campaignContent.id
    ),
    ritualTemplateId: uuid("ritual_template_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("calendar_entries_ritual_idx").on(table.ritualTemplateId)]
);

// ─── Ritual Templates ────────────────────────────────────────────────────────
export const ritualTemplates = pgTable(
  "ritual_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    platform: text("platform").notNull(),
    promptTemplate: text("prompt_template").notNull(),
    recurrence: text("recurrence").notNull(),
    dayOfWeek: integer("day_of_week"),
    isActive: boolean("is_active").notNull().default(false),
    sourceTemplateId: uuid("source_template_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ritual_templates_user_idx").on(table.userId),
    index("ritual_templates_user_active_idx").on(table.userId, table.isActive),
  ]
);

// ─── Connected Accounts ─────────────────────────────────────────────────────
export const connectedAccounts = pgTable("connected_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: timestamp("token_expires_at"),
  accountName: text("account_name"),
  accountId: text("account_id"),
  profileImageUrl: text("profile_image_url"),
  isActive: boolean("is_active").default(true),
  scopes: text("scopes").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Campaign Analytics ─────────────────────────────────────────────────────
export const campaignAnalytics = pgTable("campaign_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  totalReach: integer("total_reach").default(0),
  totalEngagements: integer("total_engagements").default(0),
  totalImpressions: integer("total_impressions").default(0),
  engagementRate: text("engagement_rate"),
  followerGrowth: integer("follower_growth").default(0),
  platformBreakdown: jsonb("platform_breakdown"),
  pillarBreakdown: jsonb("pillar_breakdown"),
  aiInsights: jsonb("ai_insights"),
  aiRecommendations: jsonb("ai_recommendations"),
  snapshotDate: timestamp("snapshot_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Content Analytics ──────────────────────────────────────────────────────
export const contentAnalytics = pgTable("content_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignContentId: uuid("campaign_content_id")
    .notNull()
    .references(() => campaignContent.id, { onDelete: "cascade" }),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  reach: integer("reach").default(0),
  impressions: integer("impressions").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  clicks: integer("clicks").default(0),
  saves: integer("saves").default(0),
  engagementRate: text("engagement_rate"),
  rawMetrics: jsonb("raw_metrics"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
// ─── Post Engagement ────────────────────────────────────────────────────────
export const postEngagement = pgTable(
  "post_engagement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignContentId: uuid("campaign_content_id")
      .notNull()
      .references(() => campaignContent.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    platformPostId: text("platform_post_id").notNull(),
    likes: integer("likes").default(0),
    comments: integer("comments").default(0),
    shares: integer("shares").default(0),
    reach: integer("reach").default(0),
    impressions: integer("impressions").default(0),
    engagementRate: text("engagement_rate"),
    recordedAt: timestamp("recorded_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("post_engagement_content_idx").on(table.campaignContentId)]
);

// ─── Platform Members ───────────────────────────────────────────────────────
export const platformMembers = pgTable(
  "platform_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    platformUserId: text("platform_user_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    firstSeenAt: timestamp("first_seen_at").defaultNow(),
    engagementCount: integer("engagement_count").default(0),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),
    status: text("status").notNull().default("prospect"),
    tags: text("tags").array().default([]),
    notes: text("notes"),
  },
  (table) => [
    index("platform_members_user_idx").on(table.userId),
    unique("platform_members_user_platform_userid_unique").on(
      table.userId,
      table.platform,
      table.platformUserId
    ),
  ]
);

// ─── Agent Runs ──────────────────────────────────────────────────────────────
export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id),
  agentType: text("agent_type").notNull(),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  modelUsed: text("model_used"),
  tokensUsed: integer("tokens_used"),
  durationMs: integer("duration_ms"),
  status: text("status"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  quizResponses: many(quizResponses),
  audienceProfiles: many(audienceProfiles),
  contentItems: many(contentItems),
  agentRuns: many(agentRuns),
  campaigns: many(campaigns),
  connectedAccounts: many(connectedAccounts),
}));

export const quizResponsesRelations = relations(
  quizResponses,
  ({ one, many }) => ({
    user: one(users, {
      fields: [quizResponses.userId],
      references: [users.id],
    }),
    audienceProfiles: many(audienceProfiles),
  })
);

export const audienceProfilesRelations = relations(
  audienceProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [audienceProfiles.userId],
      references: [users.id],
    }),
    quizResponse: one(quizResponses, {
      fields: [audienceProfiles.quizResponseId],
      references: [quizResponses.id],
    }),
    contentItems: many(contentItems),
  })
);

export const contentItemsRelations = relations(contentItems, ({ one }) => ({
  user: one(users, {
    fields: [contentItems.userId],
    references: [users.id],
  }),
  audienceProfile: one(audienceProfiles, {
    fields: [contentItems.audienceProfileId],
    references: [audienceProfiles.id],
  }),
}));

export const agentRunsRelations = relations(agentRuns, ({ one }) => ({
  user: one(users, {
    fields: [agentRuns.userId],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  audienceProfile: one(audienceProfiles, {
    fields: [campaigns.audienceProfileId],
    references: [audienceProfiles.id],
  }),
  quizResponse: one(quizResponses, {
    fields: [campaigns.quizResponseId],
    references: [quizResponses.id],
  }),
  content: many(campaignContent),
  calendarEntries: many(campaignCalendarEntries),
  analytics: many(campaignAnalytics),
}));

export const campaignContentRelations = relations(
  campaignContent,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignContent.campaignId],
      references: [campaigns.id],
    }),
    user: one(users, {
      fields: [campaignContent.userId],
      references: [users.id],
    }),
  })
);

export const connectedAccountsRelations = relations(
  connectedAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [connectedAccounts.userId],
      references: [users.id],
    }),
  })
);

export const campaignAnalyticsRelations = relations(
  campaignAnalytics,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignAnalytics.campaignId],
      references: [campaigns.id],
    }),
    user: one(users, {
      fields: [campaignAnalytics.userId],
      references: [users.id],
    }),
  })
);

export const contentAnalyticsRelations = relations(
  contentAnalytics,
  ({ one }) => ({
    campaignContent: one(campaignContent, {
      fields: [contentAnalytics.campaignContentId],
      references: [campaignContent.id],
    }),
    campaign: one(campaigns, {
      fields: [contentAnalytics.campaignId],
      references: [campaigns.id],
    }),
    user: one(users, {
      fields: [contentAnalytics.userId],
      references: [users.id],
    }),
  })
);

export const campaignCalendarEntriesRelations = relations(
  campaignCalendarEntries,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignCalendarEntries.campaignId],
      references: [campaigns.id],
    }),
    content: one(campaignContent, {
      fields: [campaignCalendarEntries.campaignContentId],
      references: [campaignContent.id],
    }),
    ritualTemplate: one(ritualTemplates, {
      fields: [campaignCalendarEntries.ritualTemplateId],
      references: [ritualTemplates.id],
    }),
  })
);

export const postEngagementRelations = relations(postEngagement, ({ one }) => ({
  campaignContent: one(campaignContent, {
    fields: [postEngagement.campaignContentId],
    references: [campaignContent.id],
  }),
}));

export const platformMembersRelations = relations(
  platformMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [platformMembers.userId],
      references: [users.id],
    }),
  })
);

// ─── Inbox Items ──────────────────────────────────────────────────────────────
export const inboxItems = pgTable(
  "inbox_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    contentId: uuid("content_id").references(() => campaignContent.id),
    platform: text("platform").notNull(),
    authorHandle: text("author_handle").notNull(),
    authorDisplayName: text("author_display_name"),
    messageText: text("message_text").notNull(),
    messageType: text("message_type").notNull(), // comment | reply | mention | dm
    status: text("status").notNull().default("unread"), // unread | read | replied
    platformMessageId: text("platform_message_id").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    flagged: boolean("flagged").notNull().default(false),
    flagReason: text("flag_reason"),
    flagCategory: text("flag_category"), // spam | toxicity | off-topic | self-promotion
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("inbox_items_user_status_idx").on(table.userId, table.status),
    index("inbox_items_user_flagged_idx").on(table.userId, table.flagged),
  ]
);

export const inboxItemsRelations = relations(inboxItems, ({ one }) => ({
  user: one(users, {
    fields: [inboxItems.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [inboxItems.campaignId],
    references: [campaigns.id],
  }),
  content: one(campaignContent, {
    fields: [inboxItems.contentId],
    references: [campaignContent.id],
  }),
}));

// ─── Blocked Senders ─────────────────────────────────────────────────────────
export const blockedSenders = pgTable(
  "blocked_senders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    handle: text("handle").notNull(),
    blockedAt: timestamp("blocked_at").notNull().defaultNow(),
  },
  (table) => [
    unique("blocked_senders_user_platform_handle_unique").on(
      table.userId,
      table.platform,
      table.handle
    ),
  ]
);

export const blockedSendersRelations = relations(blockedSenders, ({ one }) => ({
  user: one(users, {
    fields: [blockedSenders.userId],
    references: [users.id],
  }),
}));

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'post_trending' | 'new_advocate'
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("notifications_user_read_idx").on(table.userId, table.read)]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const ritualTemplatesRelations = relations(
  ritualTemplates,
  ({ one, many }) => ({
    user: one(users, {
      fields: [ritualTemplates.userId],
      references: [users.id],
    }),
    calendarEntries: many(campaignCalendarEntries),
  })
);
