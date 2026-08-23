import { describe, expect, it } from "vitest";
import { buildMarketingImagePrompt, imageFormats } from "./contentImage";

describe("MASS AI marketing image prompts", () => {
  it("includes the requested story ratio and native-language context", () => {
    const prompt = buildMarketingImagePrompt({ title: "Weekend offer", content: "Fresh coffee for nearby families", platform: "Instagram", language: "Telugu", imageFormat: "instagram_whatsapp_story" });
    expect(prompt).toContain("Required aspect ratio: 9:16");
    expect(prompt).toContain("Marketing language: Telugu");
    expect(prompt).toContain("no readable text");
  });

  it("keeps Instagram posts square", () => {
    expect(imageFormats.instagram_post).toMatchObject({ ratio: "1:1", width: 1024, height: 1024 });
  });
});
