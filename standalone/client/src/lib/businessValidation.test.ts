import { describe, expect, it } from "vitest";
import { getBusinessDescriptionError } from "./businessValidation";

describe("business description validation", () => {
  it("requires a non-empty description before onboarding is submitted", () => {
    expect(getBusinessDescriptionError("Bakery")).toBeNull();
    expect(getBusinessDescriptionError(" ")).toBe("Add a brief business description before continuing.");
  });

  it("accepts any non-empty trimmed description", () => {
    expect(getBusinessDescriptionError(" Fresh cafe ")).toBeNull();
  });
});
