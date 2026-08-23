import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { activityLogs, aiRecommendations, businessProfiles, campaigns, chatMessages, generatedContents, insights, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { calculateTrial } from "./massUtils";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) _db = drizzle(process.env.DATABASE_URL);
  return _db;
}
async function database() {
  const connection = await getDb();
  if (!connection) throw new Error("Database is not available.");
  return connection;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const connection = await getDb();
  if (!connection) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(key => { if (user[key] !== undefined) { values[key] = user[key]; updateSet[key] = user[key]; } });
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await connection.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) {
  const connection = await getDb();
  if (!connection) return undefined;
  const result = await connection.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const normalizeProfile = (row: typeof businessProfiles.$inferSelect) => ({ ...row, channels: JSON.parse(row.channels) as string[], monthlyBudget: row.monthlyBudget ? Number(row.monthlyBudget) : null });
const normalizeCampaign = (row: typeof campaigns.$inferSelect) => ({ ...row, budget: row.budget ? Number(row.budget) : null, startDate: row.startDate?.getTime() ?? null, endDate: row.endDate?.getTime() ?? null });
const normalizeInsight = (row: typeof insights.$inferSelect) => ({ ...row, spend: Number(row.spend), metricDate: row.metricDate.getTime() });

export async function getBusinessProfile(userId: number) { const connection = await database(); const result = await connection.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1); return result[0] ? normalizeProfile(result[0]) : undefined; }
export async function upsertBusinessProfile(userId: number, input: { businessName: string; businessType: string; description: string; location: string; targetAudience: string; marketingGoal: string; channels: string[]; productsServices: string; monthlyBudget?: number | null; websiteUrl?: string | null; socialLinks?: string | null }) {
  const connection = await database();
  const values = { userId, businessName: input.businessName, businessType: input.businessType, description: input.description, location: input.location, targetAudience: input.targetAudience, marketingGoal: input.marketingGoal, channels: JSON.stringify(input.channels), productsServices: input.productsServices, monthlyBudget: input.monthlyBudget?.toFixed(2) ?? null, websiteUrl: input.websiteUrl || null, socialLinks: input.socialLinks ?? null };
  await connection.insert(businessProfiles).values(values).onDuplicateKeyUpdate({ set: { ...values, userId: undefined } });
  return (await getBusinessProfile(userId))!;
}

type CampaignValues = { name: string; objective: string; description?: string | null; targetAudience?: string | null; platform?: string | null; startDate?: number | null; endDate?: number | null; budget?: number | null; status: "draft" | "planned" | "active" | "completed"; generatedContent?: string | null; notes?: string | null };
const mapCampaign = (input: CampaignValues) => ({ ...input, startDate: input.startDate ? new Date(input.startDate) : null, endDate: input.endDate ? new Date(input.endDate) : null, budget: input.budget?.toFixed(2) ?? null });
export async function listCampaigns(userId: number) { const connection = await database(); return (await connection.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.updatedAt))).map(normalizeCampaign); }
export async function getCampaign(userId: number, id: number) { const connection = await database(); const result = await connection.select().from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.id, id))).limit(1); return result[0] ? normalizeCampaign(result[0]) : undefined; }
export async function createCampaign(userId: number, input: CampaignValues) { const connection = await database(); const created = await connection.insert(campaigns).values({ userId, ...mapCampaign(input) }); return (await getCampaign(userId, Number(created[0].insertId)))!; }
export async function updateCampaign(userId: number, id: number, input: CampaignValues) { const connection = await database(); await connection.update(campaigns).set(mapCampaign(input)).where(and(eq(campaigns.userId, userId), eq(campaigns.id, id))); return getCampaign(userId, id); }
export async function updateCampaignStatus(userId: number, id: number, status: CampaignValues["status"]) { const connection = await database(); await connection.update(campaigns).set({ status }).where(and(eq(campaigns.userId, userId), eq(campaigns.id, id))); return getCampaign(userId, id); }
export async function deleteCampaign(userId: number, id: number) { const campaign = await getCampaign(userId, id); if (!campaign) return undefined; const connection = await database(); await connection.delete(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.id, id))); return campaign; }

export async function createInsight(userId: number, input: { campaignId?: number | null; metricDate: number; reach: number; impressions: number; engagement: number; clicks: number; leads: number; conversions: number; spend: number; notes?: string | null }) { const connection = await database(); const result = await connection.insert(insights).values({ userId, campaignId: input.campaignId ?? null, metricDate: new Date(input.metricDate), reach: input.reach, impressions: input.impressions, engagement: input.engagement, clicks: input.clicks, leads: input.leads, conversions: input.conversions, spend: input.spend.toFixed(2), notes: input.notes ?? null }); return getInsight(userId, Number(result[0].insertId))!; }
export async function getInsight(userId: number, id: number) { const connection = await database(); const result = await connection.select().from(insights).where(and(eq(insights.userId, userId), eq(insights.id, id))).limit(1); return result[0] ? normalizeInsight(result[0]) : undefined; }
export async function listInsights(userId: number) { const connection = await database(); return (await connection.select().from(insights).where(eq(insights.userId, userId)).orderBy(desc(insights.metricDate))).map(normalizeInsight); }

export async function saveGeneratedContent(userId: number, input: { campaignId?: number | null; type: string; platform: string; tone: string; language?: string; title: string; content: string; imageUrl?: string | null }) { const connection = await database(); const result = await connection.insert(generatedContents).values({ userId, campaignId: input.campaignId ?? null, type: input.type, platform: input.platform, tone: input.tone, language: input.language ?? "English", title: input.title, content: input.content, imageUrl: input.imageUrl ?? null }); const saved = await connection.select().from(generatedContents).where(and(eq(generatedContents.userId, userId), eq(generatedContents.id, Number(result[0].insertId)))).limit(1); return saved[0]!; }
export async function listGeneratedContent(userId: number) { const connection = await database(); return connection.select().from(generatedContents).where(eq(generatedContents.userId, userId)).orderBy(desc(generatedContents.updatedAt)); }

export async function createChatMessage(userId: number, role: "user" | "assistant", content: string) { const connection = await database(); const result = await connection.insert(chatMessages).values({ userId, role, content }); const saved = await connection.select().from(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.id, Number(result[0].insertId)))).limit(1); return saved[0]!; }
export async function listChatMessages(userId: number) { const connection = await database(); return connection.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(chatMessages.createdAt); }

export async function createRecommendation(userId: number, type: string, title: string, content: string, insightId: number | null) { const connection = await database(); await connection.insert(aiRecommendations).values({ userId, type, title, content, insightId }); }
export async function listRecommendations(userId: number) { const connection = await database(); return connection.select().from(aiRecommendations).where(eq(aiRecommendations.userId, userId)).orderBy(desc(aiRecommendations.createdAt)).limit(6); }
export async function createActivity(userId: number, type: string, description: string) { const connection = await database(); await connection.insert(activityLogs).values({ userId, type, description }); }
export async function listActivities(userId: number) { const connection = await database(); return connection.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt)).limit(8); }

export async function getDashboardSummary(userId: number, accountCreatedAt: Date) {
  const [profile, allCampaigns, recommendations, activities, allInsights] = await Promise.all([getBusinessProfile(userId), listCampaigns(userId), listRecommendations(userId), listActivities(userId), listInsights(userId)]);
  return { profile, campaigns: allCampaigns, recommendations, activities, metricsCount: allInsights.length, trial: calculateTrial(accountCreatedAt) };
}
