export const TRIAL_DURATION_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateTrial(accountCreatedAt: Date, now = new Date()) {
  const startDate = accountCreatedAt.getTime();
  const endDate = startDate + TRIAL_DURATION_DAYS * DAY_MS;
  const daysRemaining = Math.max(0, Math.ceil((endDate - now.getTime()) / DAY_MS));
  return { startDate, endDate, daysRemaining, status: daysRemaining > 0 ? "Active trial" : "Trial ended" } as const;
}

export function calculatePerformanceRates(metrics: { reach: number; impressions: number; engagement: number; clicks: number; conversions: number }) {
  return {
    engagementRate: metrics.reach > 0 ? (metrics.engagement / metrics.reach) * 100 : 0,
    clickRate: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
    conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0,
  };
}
