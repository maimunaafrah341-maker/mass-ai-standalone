# MASS AI — Standalone Deployment Guide

This is the Manus-free version of MASS AI: same features (AI Marketing
Manager, Campaign Planner, multilingual Content Studio with image
generation, Insights), running on infrastructure you control instead of
Manus's managed platform. No "Made with Manus" badge, because it's not
hosted on manus.space at all.

Your live Manus-hosted app (`massaimarket-kzpssqui.manus.space`) is
untouched by any of this — keep using it as your working fallback until
this version is fully tested.

Four accounts to set up, in this order. All have real free tiers.

---

## 1. Database — TiDB Cloud Serverless (free)

1. Go to `tidbcloud.com`, sign up (Google sign-in works).
2. Create a new **Serverless** cluster (free tier — no card required for
   this tier).
3. Once it's provisioning, go to the cluster's **Connect** tab, choose
   "General" connection, and copy the connection string. It looks like:
   `mysql://<user>.root:<password>@gateway01....tidbcloud.com:4000/test`
4. Add `?ssl={"rejectUnauthorized":true}` to the end, and put it in your
   `.env` as `DATABASE_URL`. Change the database name at the end from
   `test` to `mass_ai` (or create that database in the TiDB console first).
5. From this project folder, run:
   ```
   npm run db:push
   ```
   This creates all the tables using your existing schema — nothing to
   write by hand.

## 2. AI — Google AI Studio (free tier, no card)

1. Go to `aistudio.google.com`, sign in with Google.
2. **Get API key** (left sidebar) → **Create API key**.
3. Put it in `.env` as `GEMINI_API_KEY`.

## 3. Login — Firebase (free tier)

1. Go to `console.firebase.google.com` → **Add project** (can reuse an
   existing Google account, no card needed for the Spark/free plan).
2. In your new project: **Build → Authentication → Get started**.
   Enable **Google** and **Email/Password** as sign-in providers.
3. **Server side** — Project settings (gear icon) → **Service accounts**
   → **Generate new private key**. This downloads a JSON file containing
   `project_id`, `client_email`, and `private_key`. Put those three values
   into `.env` as `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
   `FIREBASE_PRIVATE_KEY` (keep the `\n` characters in the private key
   exactly as they appear in the JSON — don't remove or unescape them).
4. **Client side** — Project settings → **General** → scroll to
   **Your apps** → click the web icon (`</>`) to register a new web app
   (no Hosting needed, just registering). Copy `apiKey`, `authDomain`,
   `projectId`, and `appId` from the config it shows you into `.env` as
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.

## 4. Hosting — Render (recommended) or Vercel/Netlify

This app is a real Express + tRPC server (it listens on a port, not a
serverless function), so **Render** runs it with zero changes — it's a
better technical fit here than Vercel/Netlify, which expect serverless
functions and would need the backend split apart and rewritten to work
properly. If you'd still rather use Vercel/Netlify, say so and I'll do
that adaptation — just flagging it's extra work with no upside for this
app's architecture.

**Render:**
1. Push this code to a GitHub repo (a fresh one, or reuse the existing
   `mass-ai-marketing-manager` repo).
2. Go to `render.com` → **New → Blueprint**, point it at the repo. It'll
   read `render.yaml` (already included in this project) and set up the
   service automatically.
3. Fill in the env vars marked `sync: false` in the Render dashboard —
   these are the values from steps 1–3 above (`DATABASE_URL`,
   `GEMINI_API_KEY`, and the seven Firebase values). `JWT_SECRET` is
   auto-generated, and `NODE_ENV`/`GEMINI_MODEL` are already set.
4. Deploy. First build takes a few minutes.

---

## Testing checklist before you trust this for anything real

- [ ] Sign up with Google — new user appears, lands on `/app`
- [ ] Sign up with email/password
- [ ] Sign out and back in — session persists correctly
- [ ] Business onboarding completes and saves
- [ ] Create a campaign
- [ ] Generate content in at least 2 languages
- [ ] Generate an image — check it shows "public fallback" as the
      provider (expected — the built-in Manus image service isn't
      available here, so it always uses the free Pollinations fallback,
      which is completely normal and still produces real images)
- [ ] Save a content draft, confirm it appears in "Saved content"
- [ ] Refresh the page — you're still signed in

If anything fails, send me the exact error and which step it happened on.
