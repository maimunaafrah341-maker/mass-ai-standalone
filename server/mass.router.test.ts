import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  getBusinessProfile: vi.fn(), upsertBusinessProfile: vi.fn(), createActivity: vi.fn(), getDashboardSummary: vi.fn(),
  listCampaigns: vi.fn(), getCampaign: vi.fn(), createCampaign: vi.fn(), updateCampaign: vi.fn(), updateCampaignStatus: vi.fn(), deleteCampaign: vi.fn(),
  listGeneratedContent: vi.fn(), saveGeneratedContent: vi.fn(), listInsights: vi.fn(), createInsight: vi.fn(), getInsight: vi.fn(),
  listActivities: vi.fn(), listChatMessages: vi.fn(), createChatMessage: vi.fn(), createRecommendation: vi.fn(),
}));

const llmMock = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
const imageMock = vi.hoisted(() => ({ generateMarketingImage: vi.fn() }));

vi.mock("./db", () => dbMock);
vi.mock("./_core/llm", () => llmMock);
vi.mock("./contentImage", () => imageMock);

import { appRouter } from "./routers";

const user = {
  id: 42, openId: "mass-test-user", email: "owner@example.com", name: "Owner", loginMethod: "manus", role: "user" as const,
  createdAt: new Date("2026-08-01T09:00:00.000Z"), updatedAt: new Date(), lastSignedIn: new Date(),
};

function caller() {
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

const businessInput = {
  businessName: "Northside Bakery", businessType: "Bakery", description: "A neighborhood bakery with seasonal cakes.", location: "Austin, TX",
  targetAudience: "Nearby families", marketingGoal: "Increase weekend visits", channels: ["Instagram", "WhatsApp"], productsServices: "Cakes and bread", monthlyBudget: 500,
  websiteUrl: "https://example.com", socialLinks: "@northside",
};

const campaignInput = {
  name: "Weekend cakes", objective: "Increase pre-orders", description: null, targetAudience: "Nearby families", platform: "Instagram",
  startDate: null, endDate: null, budget: 300, status: "draft" as const, generatedContent: null, notes: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.createActivity.mockResolvedValue(undefined);
  dbMock.getBusinessProfile.mockResolvedValue(undefined);
  dbMock.listCampaigns.mockResolvedValue([]);
});

describe("MASS AI business and campaign procedures", () => {
  it("returns null rather than undefined when a first-time user has no business profile", async () => {
    dbMock.getBusinessProfile.mockResolvedValue(undefined);

    await expect(caller().mass.business.get()).resolves.toBeNull();
  });

  it("persists a business profile and activity against the authenticated user only", async () => {
    dbMock.upsertBusinessProfile.mockResolvedValue({ id: 1, userId: user.id, ...businessInput });

    const result = await caller().mass.business.save(businessInput);

    expect(dbMock.upsertBusinessProfile).toHaveBeenCalledWith(user.id, businessInput);
    expect(dbMock.createActivity).toHaveBeenCalledWith(user.id, "business_profile", "Business profile updated");
    expect(result.userId).toBe(user.id);
  });

  it("creates a campaign only under the authenticated user ID", async () => {
    dbMock.createCampaign.mockResolvedValue({ id: 7, userId: user.id, ...campaignInput });

    const result = await caller().mass.campaign.create(campaignInput);

    expect(dbMock.createCampaign).toHaveBeenCalledWith(user.id, campaignInput);
    expect(dbMock.createActivity).toHaveBeenCalledWith(user.id, "campaign_created", "Created campaign: Weekend cakes");
    expect(result.id).toBe(7);
  });

  it("changes campaign status through a user-scoped server helper", async () => {
    dbMock.updateCampaignStatus.mockResolvedValue({ id: 7, userId: user.id, name: "Weekend cakes", status: "active" });

    const result = await caller().mass.campaign.updateStatus({ id: 7, status: "active" });

    expect(dbMock.updateCampaignStatus).toHaveBeenCalledWith(user.id, 7, "active");
    expect(dbMock.createActivity).toHaveBeenCalledWith(user.id, "campaign_status", "Changed Weekend cakes to active");
    expect(result.status).toBe("active");
  });

  it("rejects saving content against a campaign unavailable to the current user", async () => {
    dbMock.getCampaign.mockResolvedValue(undefined);

    await expect(caller().mass.content.save({ campaignId: 99, type: "instagram_caption", platform: "Instagram", tone: "Friendly", title: "Draft", content: "A draft post" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMock.saveGeneratedContent).not.toHaveBeenCalled();
  });

  it("saves only actual user-entered insight data", async () => {
    dbMock.createInsight.mockResolvedValue({ id: 3, userId: user.id, reach: 100, impressions: 150, engagement: 8, clicks: 5, leads: 1, conversions: 0, spend: 20 });

    const result = await caller().mass.insight.create({ campaignId: null, metricDate: Date.now(), reach: 100, impressions: 150, engagement: 8, clicks: 5, leads: 1, conversions: 0, spend: 20, notes: "Observed result" });

    expect(dbMock.createInsight).toHaveBeenCalledWith(user.id, expect.objectContaining({ reach: 100, clicks: 5, spend: 20 }));
    expect(dbMock.createActivity).toHaveBeenCalledWith(user.id, "metrics_added", "Added measured performance data");
    expect(result.userId).toBe(user.id);
  });
});

describe("MASS AI personalization guards", () => {
  it("requires a completed business profile before calling the LLM", async () => {
    dbMock.getBusinessProfile.mockResolvedValue(undefined);

    await expect(caller().mass.ai.chat({ question: "What should I promote this week?" }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(llmMock.invokeLLM).not.toHaveBeenCalled();
  });

  it("instructs Content Studio to write naturally in the selected language", async () => {
    dbMock.getBusinessProfile.mockResolvedValue({ id: 1, userId: user.id, ...businessInput });
    dbMock.listCampaigns.mockResolvedValue([]);
    llmMock.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ title: "శనివారం ఆఫర్", content: "స్థానిక కుటుంబాల కోసం తాజా పేస్ట్రీలు.", callToAction: "ఈరోజే ఆర్డర్ చేయండి" }) } }] });

    const result = await caller().mass.ai.generateContent({ campaignId: null, platform: "Instagram", tone: "Warm", language: "Telugu", contentType: "instagram_caption", objective: "Drive weekend orders", targetAudience: "Nearby families", offer: "Fresh pastries" });

    expect(llmMock.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ messages: expect.arrayContaining([expect.objectContaining({ role: "system", content: expect.stringContaining("Write naturally in Telugu") })]) }));
    expect(result.title).toBe("శనివారం ఆఫర్");
  });

  it("passes the chosen social image format to the secure image-generation helper", async () => {
    imageMock.generateMarketingImage.mockResolvedValue({ imageUrl: "/manus-storage/generated/sample.png", provider: "built_in" });

    const result = await caller().mass.ai.generateMarketingImage({ title: "Weekend offer", content: "Fresh coffee for nearby families", platform: "Instagram", language: "Hindi", imageFormat: "instagram_post" });

    expect(imageMock.generateMarketingImage).toHaveBeenCalledWith(expect.objectContaining({ language: "Hindi", imageFormat: "instagram_post" }));
    expect(result).toEqual({ imageUrl: "/manus-storage/generated/sample.png", provider: "built_in" });
  });
});
