import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const businessProfiles = mysqlTable("businessProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  businessName: varchar("businessName", { length: 160 }).notNull(),
  businessType: varchar("businessType", { length: 120 }).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 220 }).notNull(),
  targetAudience: text("targetAudience").notNull(),
  marketingGoal: varchar("marketingGoal", { length: 500 }).notNull(),
  channels: text("channels").notNull(),
  productsServices: text("productsServices").notNull(),
  monthlyBudget: decimal("monthlyBudget", { precision: 12, scale: 2 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  socialLinks: text("socialLinks"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  objective: text("objective").notNull(),
  description: text("description"),
  targetAudience: text("targetAudience"),
  platform: varchar("platform", { length: 500 }),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["draft", "planned", "active", "completed"]).default("draft").notNull(),
  generatedContent: text("generatedContent"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const insights = mysqlTable("insights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  campaignId: int("campaignId"),
  metricDate: timestamp("metricDate").notNull(),
  reach: int("reach").default(0).notNull(),
  impressions: int("impressions").default(0).notNull(),
  engagement: int("engagement").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  leads: int("leads").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  spend: decimal("spend", { precision: 12, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const aiRecommendations = mysqlTable("aiRecommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  insightId: int("insightId"),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const generatedContents = mysqlTable("generatedContents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  campaignId: int("campaignId"),
  type: varchar("type", { length: 120 }).notNull(),
  platform: varchar("platform", { length: 120 }).notNull(),
  tone: varchar("tone", { length: 120 }).notNull(),
  language: varchar("language", { length: 40 }).notNull().default("English"),
  title: varchar("title", { length: 400 }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
