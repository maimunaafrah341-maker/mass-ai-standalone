import { describe, expect, it } from "vitest";
import { calculatePerformanceRates, calculateTrial, TRIAL_DURATION_DAYS } from "./massUtils";

describe("MASS AI trial calculation", () => {
  it("derives the active trial period only from the account creation date", () => {
    const accountCreatedAt = new Date("2026-08-01T09:00:00.000Z");
    const result = calculateTrial(accountCreatedAt, new Date("2026-08-05T09:00:00.000Z"));
    expect(result).toEqual({
      startDate: accountCreatedAt.getTime(),
      endDate: accountCreatedAt.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
      daysRemaining: 10,
      status: "Active trial",
    });
  });

  it("marks the trial ended without returning negative days", () => {
    const accountCreatedAt = new Date("2026-08-01T09:00:00.000Z");
    const result = calculateTrial(accountCreatedAt, new Date("2026-08-20T09:00:00.000Z"));
    expect(result.daysRemaining).toBe(0);
    expect(result.status).toBe("Trial ended");
  });
});

describe("MASS AI metric rates", () => {
  it("calculates only from actual supplied metrics and avoids division errors", () => {
    expect(calculatePerformanceRates({ reach: 1000, impressions: 2000, engagement: 80, clicks: 60, conversions: 6 })).toEqual({ engagementRate: 8, clickRate: 3, conversionRate: 10 });
    expect(calculatePerformanceRates({ reach: 0, impressions: 0, engagement: 0, clicks: 0, conversions: 0 })).toEqual({ engagementRate: 0, clickRate: 0, conversionRate: 0 });
  });
});
