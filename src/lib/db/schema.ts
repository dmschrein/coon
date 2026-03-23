import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
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
export const campaigns = pgTable("campaigns", {
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Campaign Content ───────────────────────────────────────────────────────
export const campaignContent = pgTable("campaign_content", {
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
  approvalStatus: text("approval_status").default("pending_review"),
  status: text("status").notNull().default("pending"),
  contentData: jsonb("content_data"),
  tokensUsed: integer("tokens_used"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Campaign Calendar Entries ──────────────────────────────────────────────
export const campaignCalendarEntries = pgTable("campaign_calendar_entries", {
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
  createdAt: timestamp("created_at").defaultNow(),
});

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
  })
);
