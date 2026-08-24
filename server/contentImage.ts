import { generateImage, generateImageViaGemini } from "./_core/imageGeneration";

export const imageFormats = {
  instagram_post: { label: "Instagram post (1:1)", ratio: "1:1", width: 1024, height: 1024 },
  instagram_whatsapp_story: { label: "Instagram / WhatsApp story (9:16)", ratio: "9:16", width: 1024, height: 1792 },
  whatsapp_status: { label: "WhatsApp status (9:16)", ratio: "9:16", width: 1024, height: 1792 },
} as const;

export type ImageFormat = keyof typeof imageFormats;

export function buildMarketingImagePrompt(input: { title: string; content: string; platform: string; language: string; imageFormat: ImageFormat }) {
  const format = imageFormats[input.imageFormat];
  return [
    "Create an original, photorealistic marketing image for a small business social campaign.",
    `Channel: ${input.platform}. Required aspect ratio: ${format.ratio}.`,
    `Marketing language: ${input.language}. Content theme: ${input.title}.`,
    `Caption context: ${input.content.slice(0, 900)}.`,
    "Composition: bold central subject, generous clean negative space, premium natural lighting, clear visual hierarchy.",
    "Constraints: no logos, no watermarks, no readable text, no price tags, no collage, no dashboard UI, and no invented product claims.",
  ].join("\n");
}

export async function generateMarketingImage(input: { title: string; content: string; platform: string; language: string; imageFormat: ImageFormat }) {
  const prompt = buildMarketingImagePrompt(input);
  try {
    const result = await generateImage({ prompt });
    if (!result.url) throw new Error("The built-in image service returned no image URL.");
    return { imageUrl: result.url, provider: "built_in" as const };
  } catch (builtInError) {
    // Standalone deployments (no BUILT_IN_FORGE_API_URL) have no working
    // built-in image service, so try Gemini's native image generation next —
    // it uses the same GEMINI_API_KEY that already powers text generation,
    // and is far more reliable than the last-resort public fallback below.
    try {
      const result = await generateImageViaGemini({ prompt });
      if (!result.url) throw new Error("Gemini returned no image URL.");
      return { imageUrl: result.url, provider: "gemini" as const };
    } catch (geminiError) {
      const format = imageFormats[input.imageFormat];
      // Pollinations is a free, unauthenticated, heavily-shared public API
      // and occasionally returns a transient 500 under load. Retry a few
      // times with a fresh seed each time before giving up — no dependency
      // on Manus's storage proxy either way, since Pollinations serves the
      // image directly from this URL.
      const attempts = 3;
      let lastFallbackError: unknown;
      for (let attempt = 0; attempt < attempts; attempt++) {
        const sourceUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${format.width}&height=${format.height}&nologo=true&seed=${Date.now()}-${attempt}`;
        try {
          const response = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(60000) });
          if (!response.ok) throw new Error(`Public fallback returned ${response.status}.`);
          return { imageUrl: sourceUrl, provider: "pollinations" as const };
        } catch (fallbackError) {
          lastFallbackError = fallbackError;
          console.warn(`[MASS AI] Pollinations attempt ${attempt + 1}/${attempts} failed`, fallbackError);
          if (attempt < attempts - 1) await new Promise(r => setTimeout(r, 1500));
        }
      }
      console.error("[MASS AI] Marketing image generation failed", {
        builtInError,
        geminiError,
        fallbackError: lastFallbackError,
      });
      throw new Error("MASS AI could not generate an image right now. Please try again shortly.");
    }
  }
}
