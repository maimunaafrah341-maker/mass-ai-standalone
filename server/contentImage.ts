import {
  generateImage,
  generateImageViaCloudflare,
  generateImageViaGemini,
  generateImageViaHuggingFace,
} from "./_core/imageGeneration";
import { findStockPhoto } from "./_core/stockPhoto";

export const imageFormats = {
  instagram_post: { label: "Instagram post (1:1)", ratio: "1:1", width: 1024, height: 1024 },
  instagram_whatsapp_story: { label: "Instagram / WhatsApp story (9:16)", ratio: "9:16", width: 1024, height: 1792 },
  whatsapp_status: { label: "WhatsApp status (9:16)", ratio: "9:16", width: 1024, height: 1792 },
} as const;

export type ImageFormat = keyof typeof imageFormats;
export type ImageProvider = "built_in" | "gemini" | "cloudflare" | "huggingface" | "pollinations" | "stock_photo";

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

// Pollinations is a free, unauthenticated, heavily-shared public API and
// occasionally returns a transient error under load (or gets rate-limited
// by IP range). Retry a few times with a fresh seed before giving up — no
// dependency on Manus's storage proxy either way, since Pollinations serves
// the image directly from this URL.
async function generateViaPollinations(prompt: string, format: (typeof imageFormats)[ImageFormat]): Promise<{ imageUrl: string }> {
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const sourceUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${format.width}&height=${format.height}&nologo=true&seed=${Date.now()}-${attempt}`;
    try {
      const response = await fetch(sourceUrl, { method: "HEAD", signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`Public fallback returned ${response.status}.`);
      return { imageUrl: sourceUrl };
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Pollinations failed");
}

export async function generateMarketingImage(input: { title: string; content: string; platform: string; language: string; imageFormat: ImageFormat }) {
  const prompt = buildMarketingImagePrompt(input);
  const format = imageFormats[input.imageFormat];
  const orientation = format.ratio === "1:1" ? "square" : "portrait";

  // Ordered from most to least ideal. Every tier is independently optional —
  // an unconfigured provider (missing API key) just throws fast and we move
  // on to the next one. Stock photos are the guaranteed-to-work last resort.
  const attempts: Array<{ provider: ImageProvider; run: () => Promise<{ imageUrl: string }> }> = [
    {
      provider: "built_in",
      run: async () => {
        const result = await generateImage({ prompt });
        if (!result.url) throw new Error("The built-in image service returned no image URL.");
        return { imageUrl: result.url };
      },
    },
    {
      provider: "gemini",
      run: async () => {
        const result = await generateImageViaGemini({ prompt });
        if (!result.url) throw new Error("Gemini returned no image URL.");
        return { imageUrl: result.url };
      },
    },
    {
      provider: "cloudflare",
      run: async () => {
        const result = await generateImageViaCloudflare({ prompt });
        if (!result.url) throw new Error("Cloudflare Workers AI returned no image URL.");
        return { imageUrl: result.url };
      },
    },
    {
      provider: "huggingface",
      run: async () => {
        const result = await generateImageViaHuggingFace({ prompt });
        if (!result.url) throw new Error("Hugging Face returned no image URL.");
        return { imageUrl: result.url };
      },
    },
    { provider: "pollinations", run: () => generateViaPollinations(prompt, format) },
    {
      provider: "stock_photo",
      run: async () => {
        const result = await findStockPhoto(input.title, orientation);
        return { imageUrl: result.url };
      },
    },
  ];

  const errors: Partial<Record<ImageProvider, unknown>> = {};
  for (const attempt of attempts) {
    try {
      const { imageUrl } = await attempt.run();
      return { imageUrl, provider: attempt.provider };
    } catch (error) {
      errors[attempt.provider] = error;
    }
  }

  console.error("[MASS AI] Marketing image generation failed on every provider", errors);
  throw new Error("MASS AI could not generate an image right now. Please try again shortly.");
}
