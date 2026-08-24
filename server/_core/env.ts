// Standalone deployment note (Vercel/Netlify, outside Manus):
// Manus's managed environment injects BUILT_IN_FORGE_API_URL/KEY to proxy AI
// calls. Outside that environment those are never set, so when only
// GEMINI_API_KEY is provided we point the same "forge" client at Google's
// public OpenAI-compatible Gemini endpoint instead. server/_core/llm.ts
// already speaks the OpenAI chat-completions wire format, so no other code
// needs to change for text generation. Image generation (server/_core/imageGeneration.ts)
// uses a Forge-only RPC shape that Gemini's endpoint can't serve; that's fine
// — it fails fast and server/contentImage.ts already falls back to a free
// public image API (Pollinations) with no key required.
const geminiApiKey = process.env.GEMINI_API_KEY ?? "";
const forgeApiUrl =
  process.env.BUILT_IN_FORGE_API_URL ??
  (geminiApiKey ? "https://generativelanguage.googleapis.com/v1beta/openai" : "");
const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY ?? geminiApiKey;

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl,
  forgeApiKey,
  // Raw Gemini API key, used for native Gemini image generation (the
  // OpenAI-compat "forge" endpoint above can't serve image generation).
  geminiApiKey,
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
  // Firebase Admin (standalone auth) — see server/_core/firebaseAuth.ts
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
};
