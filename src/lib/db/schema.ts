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
