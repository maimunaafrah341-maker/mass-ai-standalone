import { describe, expect, it } from "vitest";
import { getBusinessDescriptionError } from "../client/src/lib/businessValidation";

describe("onboarding business-description validation", () => {
  it("blocks only an empty business description before a profile-save request is sent", () => {
    expect(getBusinessDescriptionError("Bakery")).toBeNull();
    expect(getBusinessDescriptionError(" ")).toBe("Add a brief business description before continuing.");
  });

  it("accepts a trimmed non-empty description", () => {
    expect(getBusinessDescriptionError(" Fresh cafe ")).toBeNull();
  });
});
