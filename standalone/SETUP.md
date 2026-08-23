# MASS AI — Standalone Deployment Setup

This is the Manus-free version: same app, same features (image generation,
multilingual content, campaigns, insights), running on your own accounts
instead of Manus's managed environment. Everything below has already been
built and tested (17/17 tests passing, clean production build) — this guide
is just the credentials you need to create yourself, since only you can sign
into these services.

Budget about 45–60 minutes for this, done once.

---

## 1. Database — TiDB Cloud Serverless (free)

Your existing database schema (Drizzle + MySQL) needs zero code changes —
just a new connection string.

1. Go to `tidbcloud.com`, sign up (no card required for the Serverless free tier).
2. Create a new **Serverless** cluster (any region close to you, e.g. Mumbai).
3. Once created, click **Connect**, choose "General" connection, and copy the
   connection string. It looks like:
   `mysql://[user]:[password]@[host]:4000/test?ssl={"rejectUnauthorized":true}`
4. Replace `test` with `mass_ai` (or your preferred database name).
5. Save this as your `DATABASE_URL` — you'll need it in step 5.

**Push your schema to the new database**, from your own machine:
```bash
# In the project folder, create a .env file with just this line:
echo 'DATABASE_URL="<paste your connection string here>"' > .env

npm install
npm run db:push
```
This creates all the tables (users, campaigns, content, insights, etc.) in
your new database. You should see it complete without errors.

---

## 2. AI — Google Gemini API key (free tier)

1. Go to `aistudio.google.com`, sign in with Google.
2. Click **Get API key** (left sidebar) → **Create API key**.
3. Copy it — this is your `GEMINI_API_KEY`. No card needed for the free tier.

---

## 3. Auth — Firebase (free)

1. Go to `console.firebase.google.com`, click **Add project**, name it
   anything (e.g. "mass-ai"), you can skip Google Analytics.
2. In your new project: **Build → Authentication → Get started**.
3. Enable two sign-in methods: **Google** and **Email/Password** (toggle
   each on, click Save).
4. Get the **server** credentials: gear icon (top left) → **Project
   settings → Service accounts → Generate new private key**. This
   downloads a JSON file containing:
   - `project_id` → your `FIREBASE_PROJECT_ID`
   - `client_email` → your `FIREBASE_CLIENT_EMAIL`
   - `private_key` → your `FIREBASE_PRIVATE_KEY` (keep the `\n` characters
     exactly as they appear in the file when you paste this into Render)
5. Get the **client** config: gear icon → **Project settings → General →
   scroll to "Your apps" → click the `</>` (web) icon → register an app
   (nickname doesn't matter, skip hosting). It'll show a config object —
   from it, copy:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`

You'll add your live Render URL to Firebase's authorized domains list in
step 5, after you know what it is.

---

## 4. Deploy — Render (free)

1. Push this code to a GitHub repo (a new one, or reuse the existing MASS
   repo — either works).
2. Go to `render.com`, sign up/in, click **New → Web Service**, connect
   that GitHub repo. Render should auto-detect `render.yaml` in this
   project and pre-fill the service config — if not, set manually:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Under **Environment**, add each of these (values from steps 1–3 above):
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   (`NODE_ENV`, `GEMINI_MODEL`, and `JWT_SECRET` are already set by
   `render.yaml`.)
4. Click **Create Web Service**. First deploy takes a few minutes — watch
   the logs for `Server running on http://localhost:...`.

**Free tier note:** Render's free web services sleep after 15 minutes of no
traffic, and take ~30–60 seconds to wake up on the next visit. For a pitch
demo, open the live link a minute or two before you go on stage so it's
already awake — don't rely on the first click being instant.

---

## 5. Last step — authorize your Render domain in Firebase

1. Copy your live Render URL (e.g. `mass-ai-marketing-manager.onrender.com`).
2. Firebase console → **Authentication → Settings → Authorized domains
   → Add domain** → paste it in.

Without this, Google sign-in will fail with an "unauthorized domain" error.

---

## 6. Test it like a judge would

- [ ] Open the Render URL fresh (not logged in)
- [ ] Sign up with Google — should land on `/app`
- [ ] Sign out, sign back in with email/password — should also work
- [ ] Complete business onboarding
- [ ] Create a campaign
- [ ] Generate content in a non-English language (Hindi/Telugu/Urdu)
- [ ] Generate a matching image
- [ ] Check the AI Marketing Manager chat responds
- [ ] Refresh the page mid-session — you should stay logged in

If anything fails, check the Render logs (Dashboard → your service → Logs)
— most issues at this stage are a missing/mistyped environment variable.

---

## What changed from the Manus version (for your own reference)

- `server/_core/firebaseAuth.ts` — new, replaces Manus OAuth
- `client/src/lib/firebase.ts`, `client/src/pages/Login.tsx` — new, client auth
- `client/src/const.ts`, `client/src/main.tsx` — updated to use Firebase tokens
- `server/_core/env.ts` — routes AI calls to Gemini's public API when no
  Manus Forge config is present
- `server/contentImage.ts` — image fallback no longer depends on Manus's
  file storage
- `vite.config.ts`, `package.json` — removed three Manus-only dev plugins
  that don't work (and aren't needed) outside Manus's environment
- Database, campaign, content, and insights logic — **unchanged**, this is
  still Sadaf's original engineering
