import { generateImage } from "./_core/imageGeneration";

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
    const format = imageFormats[input.imageFormat];
    const sourceUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${format.width}&height=${format.height}&nologo=true&seed=${Date.now()}`;
    try {
      // Confirm the image actually renders before handing the URL to the
      // client. Pollinations serves the image directly from this same URL —
      // no re-upload to blob storage needed, so this path has no dependency
      // on Manus's storage proxy and works unmodified in any environment.
      const response = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`Public fallback returned ${response.status}.`);
      return { imageUrl: sourceUrl, provider: "pollinations" as const };
    } catch (fallbackError) {
      console.error("[MASS AI] Marketing image generation failed", { builtInError, fallbackError });
      throw new Error("MASS AI could not generate an image right now. Please try again shortly.");
    }
  }
}
