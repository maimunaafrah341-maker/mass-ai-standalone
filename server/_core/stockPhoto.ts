import { ENV } from "./env";

export type StockPhotoOrientation = "square" | "portrait" | "landscape";

/**
 * Find a real (non-AI-generated) stock photo via Pexels' free API, as the
 * last-resort image fallback in server/contentImage.ts. Pexels serves the
 * image directly from the returned URL — no re-upload to blob storage
 * needed.
 */
export async function findStockPhoto(
  query: string,
  orientation: StockPhotoOrientation
): Promise<{ url: string }> {
  if (!ENV.pexelsApiKey) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}`;

  const response = await fetch(url, {
    headers: { authorization: ENV.pexelsApiKey },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Pexels search failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    photos?: Array<{ src: { large: string } }>;
  };

  const photo = result.photos?.[0];
  if (!photo) {
    throw new Error(`Pexels found no stock photo matching "${query}"`);
  }

  return { url: photo.src.large };
}
