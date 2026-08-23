import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { generateMarketingImage, ImageFormat } from "../contentImage";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const optionalText = z.string().trim().max(4000).optional().nullable();
const channels = z.array(z.string().trim().min(1).max(80)).max(10);
const campaignStatus = z.enum(["draft", "planned", "active", "completed"]);
const contentLanguage = z.enum(["English", "Hindi", "Telugu", "Urdu"]);
const marketingImageFormat = z.enum(["instagram_post", "instagram_whatsapp_story", "whatsapp_status"]);

const businessInput = z.object({
  businessName: z.string().trim().min(2).max(160),
  businessType: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(3000),
  location: z.string().trim().min(2).max(220),
  targetAudience: z.string().trim().min(2).max(1000),
  marketingGoal: z.string().trim().min(2).max(500),
  channels,
  productsServices: z.string().trim().min(2).max(3000),
  monthlyBudget: z.number().min(0).max(100000000).optional().nullable(),
  websiteUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  socialLinks: z.string().trim().max(1500).optional().nullable(),
});

const campaignInput = z.object({
  name: z.string().trim().min(2).max(180),
  objective: z.string().trim().min(2).max(1000),
  description: optionalText,
  targetAudience: optionalText,
  platform: optionalText,
  startDate: z.number().int().positive().optional().nullable(),
  endDate: z.number().int().positive().optional().nullable(),
  budget: z.number().min(0).max(100000000).optional().nullable(),
  status: campaignStatus.default("draft"),
  generatedContent: optionalText,
  notes: optionalText,
});

const plannerInput = z.object({
  goal: z.string().trim().min(2).max(800),
  product: z.string().trim().min(2).max(800),
  audience: z.string().trim().min(2).max(800),
  budget: z.number().min(0).max(100000000).optional().nullable(),
  platform: z.string().trim().min(2).max(160),
  duration: z.string().trim().min(2).max(160),
});

const contentInput = z.object({
  campaignId: z.number().int().positive().optional().nullable(),
  platform: z.string().trim().min(2).max(120),
  tone: z.string().trim().min(2).max(120),
  objective: z.string().trim().min(2).max(800),
  targetAudience: z.string().trim().min(2).max(800),
  offer: z.string().trim().min(2).max(1000),
  contentType: z.enum(["instagram_caption", "promotional_post", "whatsapp_message", "ad_copy", "short_form_idea", "headline", "cta"]),
  language: contentLanguage.default("English"),
});

const metricsInput = z.object({
  campaignId: z.number().int().positive().optional().nullable(),
  metricDate: z.number().int().positive(),
  reach: z.number().int().min(0).max(2147483647).default(0),
  impressions: z.number().int().min(0).max(2147483647).default(0),
  engagement: z.number().int().min(0).max(2147483647).default(0),
  clicks: z.number().int().min(0).max(2147483647).default(0),
  leads: z.number().int().min(0).max(2147483647).default(0),
  conversions: z.number().int().min(0).max(2147483647).default(0),
  spend: z.number().min(0).max(100000000).default(0),
  notes: optionalText,
});

type ProfileContext = Awaited<ReturnType<typeof db.getBusinessProfile>>;

function requireProfile(profile: ProfileContext) {
  if (!profile) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Complete your business profile so MASS AI can provide personalized guidance.",
    });
  }
  return profile;
}

function profileContext(profile: NonNullable<ProfileContext>, campaigns: Awaited<ReturnType<typeof db.listCampaigns>>) {
  return JSON.stringify({
    business: {
      name: profile.businessName,
      type: profile.businessType,
      description: profile.description,
      location: profile.location,
      audience: profile.targetAudience,
      goal: profile.marketingGoal,
      channels: profile.channels,
      productsServices: profile.productsServices,
      monthlyBudget: profile.monthlyBudget,
    },
    campaigns: campaigns.map(c => ({
      name: c.name,
      objective: c.objective,
      platform: c.platform,
      status: c.status,
      budget: c.budget,
      startDate: c.startDate,
      endDate: c.endDate,
    })),
  });
}

async function runAI(system: string, prompt: string, schema?: Record<string, unknown>) {
  try {
    const response = await invokeLLM({
      // "gemini-3-flash-preview" is a Manus-internal Forge model alias.
      // When running standalone against Google's public Gemini API, use a
      // real published model id here — check ai.google.dev/gemini-api/docs/models
      // for the current one if this ever 404s (model names get retired).
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      max_tokens: 3000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      ...(schema
        ? {
            response_format: {
              type: "json_schema" as const,
              json_schema: { name: "mass_ai_response", strict: true, schema },
            },
          }
        : {}),
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("MASS AI returned no usable content.");
    return content;
  } catch (error) {
    console.error("[MASS AI] LLM request failed", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "MASS AI is temporarily unavailable. Please try again shortly.",
    });
  }
}

const plannerSchema = {
  type: "object",
  properties: {
    campaignName: { type: "string" },
    objective: { type: "string" },
    targetAudience: { type: "string" },
    recommendedChannels: { type: "array", items: { type: "string" } },
    keyMessage: { type: "string" },
    contentIdeas: { type: "array", items: { type: "string" } },
    postingSchedule: { type: "array", items: { type: "string" } },
    callToAction: { type: "string" },
    successMetrics: { type: "array", items: { type: "string" } },
    budgetAllocation: { type: "array", items: { type: "string" } },
  },
  required: ["campaignName", "objective", "targetAudience", "recommendedChannels", "keyMessage", "contentIdeas", "postingSchedule", "callToAction", "successMetrics", "budgetAllocation"],
  additionalProperties: false,
};

const contentSchema = {
  type: "object",
  properties: { title: { type: "string" }, content: { type: "string" }, callToAction: { type: "string" } },
  required: ["title", "content", "callToAction"],
  additionalProperties: false,
};

const interpretationSchema = {
  type: "object",
  properties: {
    interpretation: { type: "string" },
    recommendation: { type: "string" },
    executionSteps: { type: "array", items: { type: "string" } },
    metricToMonitor: { type: "string" },
  },
  required: ["interpretation", "recommendation", "executionSteps", "metricToMonitor"],
  additionalProperties: false,
};

export const massRouter = router({
  business: router({
    get: protectedProcedure.query(async ({ ctx }) => (await db.getBusinessProfile(ctx.user.id)) ?? null),
    save: protectedProcedure.input(businessInput).mutation(async ({ ctx, input }) => {
      const profile = await db.upsertBusinessProfile(ctx.user.id, input);
      await db.createActivity(ctx.user.id, "business_profile", "Business profile updated");
      return profile;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => db.getDashboardSummary(ctx.user.id, ctx.user.createdAt)),
  }),
  campaign: router({
    list: protectedProcedure.query(({ ctx }) => db.listCampaigns(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const campaign = await db.getCampaign(ctx.user.id, input.id);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
      return campaign;
    }),
    create: protectedProcedure.input(campaignInput).mutation(async ({ ctx, input }) => {
      const campaign = await db.createCampaign(ctx.user.id, input);
      await db.createActivity(ctx.user.id, "campaign_created", `Created campaign: ${campaign.name}`);
      return campaign;
    }),
    update: protectedProcedure.input(campaignInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      const campaign = await db.updateCampaign(ctx.user.id, id, values);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
      await db.createActivity(ctx.user.id, "campaign_updated", `Updated campaign: ${campaign.name}`);
      return campaign;
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await db.deleteCampaign(ctx.user.id, input.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
      await db.createActivity(ctx.user.id, "campaign_deleted", `Deleted campaign: ${deleted.name}`);
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: campaignStatus })).mutation(async ({ ctx, input }) => {
      const campaign = await db.updateCampaignStatus(ctx.user.id, input.id, input.status);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
      await db.createActivity(ctx.user.id, "campaign_status", `Changed ${campaign.name} to ${input.status}`);
      return campaign;
    }),
  }),
  content: router({
    list: protectedProcedure.query(({ ctx }) => db.listGeneratedContent(ctx.user.id)),
    save: protectedProcedure.input(z.object({ campaignId: z.number().int().positive().optional().nullable(), type: z.string().trim().min(2).max(120), platform: z.string().trim().min(2).max(120), tone: z.string().trim().min(2).max(120), language: contentLanguage.default("English"), title: z.string().trim().min(1).max(400), content: z.string().trim().min(1).max(10000), imageUrl: z.string().url().max(2000).optional().nullable() })).mutation(async ({ ctx, input }) => {
      if (input.campaignId && !(await db.getCampaign(ctx.user.id, input.campaignId))) throw new TRPCError({ code: "NOT_FOUND", message: "Selected campaign not found." });
      const content = await db.saveGeneratedContent(ctx.user.id, input);
      await db.createActivity(ctx.user.id, "content_saved", `Saved ${input.type.replaceAll("_", " ")}`);
      return content;
    }),
  }),
  insight: router({
    list: protectedProcedure.query(({ ctx }) => db.listInsights(ctx.user.id)),
    create: protectedProcedure.input(metricsInput).mutation(async ({ ctx, input }) => {
      if (input.campaignId && !(await db.getCampaign(ctx.user.id, input.campaignId))) throw new TRPCError({ code: "NOT_FOUND", message: "Selected campaign not found." });
      const insight = await db.createInsight(ctx.user.id, input);
      await db.createActivity(ctx.user.id, "metrics_added", "Added measured performance data");
      return insight;
    }),
  }),
  activity: router({ list: protectedProcedure.query(({ ctx }) => db.listActivities(ctx.user.id)) }),
  ai: router({
    chatHistory: protectedProcedure.query(({ ctx }) => db.listChatMessages(ctx.user.id)),
    chat: protectedProcedure.input(z.object({ question: z.string().trim().min(2).max(4000) })).mutation(async ({ ctx, input }) => {
      const profile = requireProfile(await db.getBusinessProfile(ctx.user.id));
      const campaigns = await db.listCampaigns(ctx.user.id);
      const context = profileContext(profile, campaigns);
      const answer = await runAI(
        "You are MASS AI, an affordable AI Marketing Manager for small businesses. Use only supplied context. Do not invent business facts, performance, or outcomes. Do not guarantee revenue or growth. Answer in this structure: Recommendation, Why, How to execute, Metric to monitor. If context is missing, state the missing information and clearly label any general suggestion.",
        `BUSINESS CONTEXT:\n${context}\n\nQUESTION:\n${input.question}`,
      );
      await db.createChatMessage(ctx.user.id, "user", input.question);
      const saved = await db.createChatMessage(ctx.user.id, "assistant", answer);
      await db.createRecommendation(ctx.user.id, "marketing_guidance", "MASS AI recommendation", answer, null);
      await db.createActivity(ctx.user.id, "ai_guidance", "Asked MASS AI for guidance");
      return saved;
    }),
    planner: protectedProcedure.input(plannerInput).mutation(async ({ ctx, input }) => {
      const profile = requireProfile(await db.getBusinessProfile(ctx.user.id));
      const campaigns = await db.listCampaigns(ctx.user.id);
      const response = await runAI(
        "You are MASS AI's campaign planner. Create a realistic, actionable plan for the supplied business and request. Do not invent facts or promise outcomes. Be specific to the actual business context and use only the proposed budget. Return only the required JSON.",
        `BUSINESS CONTEXT:\n${profileContext(profile, campaigns)}\n\nCAMPAIGN REQUEST:\n${JSON.stringify(input)}`,
        plannerSchema,
      );
      try { return JSON.parse(response) as Record<string, unknown>; } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MASS AI returned an invalid campaign plan. Please try again." }); }
    }),
    generateContent: protectedProcedure.input(contentInput).mutation(async ({ ctx, input }) => {
      const profile = requireProfile(await db.getBusinessProfile(ctx.user.id));
      const campaigns = await db.listCampaigns(ctx.user.id);
      const campaign = input.campaignId ? campaigns.find(item => item.id === input.campaignId) : undefined;
      if (input.campaignId && !campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Selected campaign not found." });
      const response = await runAI(
        `You are MASS AI's content studio. Generate accurate, edit-ready marketing copy from supplied business and campaign context. Write naturally in ${input.language}; use native phrasing and culturally natural expression, never literal translation. Do not make unsupported claims. Do not say content is published or scheduled. Return only required JSON.`,
        `BUSINESS CONTEXT:\n${profileContext(profile, campaigns)}\n\nCAMPAIGN CONTEXT:\n${JSON.stringify(campaign ?? null)}\n\nCONTENT REQUEST:\n${JSON.stringify(input)}`,
        contentSchema,
      );
      try { return JSON.parse(response) as { title: string; content: string; callToAction: string }; } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MASS AI returned invalid content. Please try again." }); }
    }),
    generateMarketingImage: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(400), content: z.string().trim().min(1).max(10000), platform: z.string().trim().min(2).max(120), language: contentLanguage.default("English"), imageFormat: marketingImageFormat })).mutation(async ({ input }) => {
      return generateMarketingImage({ ...input, imageFormat: input.imageFormat as ImageFormat });
    }),
    interpretInsight: protectedProcedure.input(z.object({ insightId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const profile = requireProfile(await db.getBusinessProfile(ctx.user.id));
      const insight = await db.getInsight(ctx.user.id, input.insightId);
      if (!insight) throw new TRPCError({ code: "NOT_FOUND", message: "Measured data not found." });
      const campaigns = await db.listCampaigns(ctx.user.id);
      const response = await runAI(
        "You are MASS AI's insight analyst. Interpret only the actual measured data supplied. Clearly explain that this is an AI interpretation, not measured data. Do not invent results or guarantee outcomes. Return only required JSON.",
        `BUSINESS CONTEXT:\n${profileContext(profile, campaigns)}\n\nACTUAL MEASURED DATA:\n${JSON.stringify(insight)}`,
        interpretationSchema,
      );
      try {
        const result = JSON.parse(response) as { interpretation: string; recommendation: string; executionSteps: string[]; metricToMonitor: string };
        await db.createRecommendation(ctx.user.id, "insight", "AI insight interpretation", JSON.stringify(result), input.insightId);
        await db.createActivity(ctx.user.id, "ai_insight", "Generated an AI interpretation of measured data");
        return result;
      } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MASS AI returned an invalid insight interpretation. Please try again." }); }
    }),
  }),
});
