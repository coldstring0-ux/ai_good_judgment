import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name"),
  phase: integer("phase").notNull().default(1),
  phaseStartedAt: integer("phase_started_at", { mode: "timestamp" }),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
  settings: text("settings", { mode: "json" }).$type<{
    dailyReminder?: boolean;
    theme?: "light" | "dark";
    domains?: string[];
    deepseekKey?: string;
    openaiKey?: string;
    aiProvider?: "deepseek" | "openai";
  }>().default({}),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const drills = sqliteTable("drills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["quantification", "bias_check", "confidence_interval"] }).notNull(),
  phase: integer("phase").notNull(),
  question: text("question").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<{
    correctAnswer?: string | number | [number, number];
    explanation?: string;
    difficulty?: "easy" | "medium" | "hard";
    biasType?: string;
  }>().default({}),
  userResponse: text("user_response", { mode: "json" }).$type<{
    probability?: number;
    selectedBias?: string;
    reflection?: string;
    lowerBound?: number;
    upperBound?: number;
  }>(),
  score: real("score"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Drill = typeof drills.$inferSelect;

export const predictionQuestions = sqliteTable("prediction_questions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  domain: text("domain").notNull(),
  questionText: text("question_text").notNull(),
  resolutionCriteria: text("resolution_criteria"),
  opensAt: integer("opens_at", { mode: "timestamp" }),
  closesAt: integer("closes_at", { mode: "timestamp" }),
  outcome: integer("outcome", { mode: "boolean" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type PredictionQuestion = typeof predictionQuestions.$inferSelect;

export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => predictionQuestions.id),
  userId: text("user_id").notNull().references(() => users.id),
  probability: real("probability").notNull(),
  confLower: real("conf_lower"),
  confUpper: real("conf_upper"),
  reasoning: text("reasoning"),
  baselineRate: real("baseline_rate"),
  baselineNotes: text("baseline_notes"),
  sourceGrades: text("source_grades", { mode: "json" }).$type<Array<{
    url: string;
    grade: string;
    strength: string;
  }>>(),
  biasNotes: text("bias_notes"),
  brierScore: real("brier_score"),
  version: integer("version").notNull().default(1),
  isFinal: integer("is_final", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Prediction = typeof predictions.$inferSelect;

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  predictionId: text("prediction_id").notNull().references(() => predictions.id),
  sourceUrl: text("source_url"),
  title: text("title"),
  reliability: text("reliability", { enum: ["A", "B", "C", "D", "F"] }),
  strength: text("strength", { enum: ["strong", "medium", "weak"] }),
  direction: text("direction", { enum: ["supports", "opposes", "neutral"] }),
  summary: text("summary").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Evidence = typeof evidence.$inferSelect;

export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  situation: text("situation").notNull(),
  decision: text("decision").notNull(),
  predictedOutcome: text("predicted_outcome"),
  confidence: real("confidence"),
  stopLoss: text("stop_loss"),
  actualOutcome: text("actual_outcome"),
  outcomeRating: text("outcome_rating", { enum: ["correct", "partially", "wrong", "pending"] }).notNull().default("pending"),
  lessons: text("lessons"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
