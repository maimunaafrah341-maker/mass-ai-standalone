# MASS AI — AI Marketing Manager for Small Business

MASS AI is a full-stack SaaS MVP for local and small businesses that need structured, practical marketing support. Rather than operating as a generic caption generator, the product brings the owner’s business context into a complete operating loop: **Understand → Plan → Create → Measure → Learn**. It provides persistent user-scoped campaigns, editable generated content, manually entered performance measurements, and server-side AI guidance.

> **Product principle:** MASS AI presents recommendations and AI interpretations as assistance, not guarantees. It does not invent business facts, measured results, subscriptions, or payment status.

## Product capabilities

| Capability | Implementation |
| --- | --- |
| Authentication | Manus OAuth sign-in, logout, persistent session handling, and a protected `/app` workspace route. |
| Business onboarding | Captures a name, category, description, location, audience, goal, channels, products/services, budget, website, and social links. |
| Marketing command center | Shows business context, actual trial state, campaign pulse, recent activity, guidance, and the required quick actions. |
| Campaign management | Provides persistent creation, editing, deletion, viewing, and lifecycle changes for Draft, Planned, Active, and Completed campaigns. |
| AI Marketing Manager | Uses stored business and campaign context to answer questions in a recommendation-oriented format. |
| AI Campaign Planner | Produces a structured plan that can be reviewed and saved as a draft campaign. |
| AI Content Studio | Generates editable captions, promotional posts, WhatsApp messages, ad copy, short-form ideas, headlines, and calls to action. It supports natural native-language writing in English, Hindi, Telugu, and Urdu. |
| Matching social creative | After a draft is generated, creates an optional original image for a 1:1 Instagram post or a 9:16 Instagram/WhatsApp story or WhatsApp status, with a direct download link. |
| Marketing Insights | Stores actual user-entered measurements and clearly separates raw values from AI-generated interpretation and recommendations. |
| Trial calculation | Calculates the 14-day trial only from the authenticated user’s real account creation date. |

## Technology architecture

The project uses the managed full-stack template with React 19, TypeScript, Vite, Tailwind CSS 4, Express, tRPC, Drizzle ORM, and a MySQL/TiDB-compatible managed database. Authentication is handled by Manus OAuth. The AI features use the platform’s secure server-side OpenAI-compatible proxy with the Gemini-compatible `gemini-3-flash-preview` model; no model credential is exposed to client-side code.

| Layer | Role |
| --- | --- |
| `client/` | The public marketing site, responsive protected workspace, onboarding, campaigns, chat, content studio, insights, and settings interfaces. |
| `server/routers/mass.ts` | Authenticated tRPC procedures, input validation, business-context assembly, and server-side AI interactions. |
| `server/db.ts` | User-scoped Drizzle persistence queries. Every feature query receives the authenticated user ID and filters by it. |
| `drizzle/schema.ts` | Application tables for profiles, campaigns, metrics, AI recommendations, generated content, chat history, and activity history. |
| `server/massUtils.ts` | Pure trial and performance-rate calculations, covered by unit tests. |
| `server/contentImage.ts` | Built-in-first social-image generation helper, including a Pollinations fallback and format-aware prompts. |

## Uploaded-source migration record

The uploaded archive was reviewed as a source of landing-page design and marketing content. Its legacy Firebase/static implementation was not adopted as the application runtime because the active project already provides the requested React, tRPC, Drizzle, OAuth, and user-scoped persistence architecture. The React public page now incorporates the uploaded source’s deep-navy, electric-blue, and warm-red visual palette; MASS.ai-style identity treatment; dashboard-window hero presentation; “small business reality” roadblock framing; all-in-one solution panel; core capability cards; and practical three-step marketing loop.

The active full-stack application remains the primary product implementation. Its business onboarding, campaign CRUD, AI Marketing Manager chat, Campaign Planner, editable Content Studio, marketing insights, real-date trial calculation, and protected user-scoped data access are retained. The Content Studio is extended rather than replaced: it now preserves the existing editable-save behavior while adding language metadata and optional generated-image URLs.

## Data model and user isolation

Every product record includes `userId` and is accessed only by server procedures guarded by `protectedProcedure`. A business profile is one-to-one with the user; campaign, insight, content, chat, recommendation, and activity tables all filter by the authenticated user ID. Campaign and insight references are also verified against the same user before use, preventing an authenticated user from attaching a record to another user’s resource.

| Table | Purpose |
| --- | --- |
| `businessProfiles` | The grounded business context used throughout MASS AI. |
| `campaigns` | Persistent campaign details, status, dates, budget, content, and notes. |
| `insights` | Actual manually entered reach, impressions, engagement, clicks, leads, conversions, spend, and notes. |
| `aiRecommendations` | Saved server-generated guidance and insight interpretations. |
| `generatedContents` | Editable saved marketing content, channel, type, tone, language, optional generated image URL, and optional campaign relationship. |
| `chatMessages` | User-scoped AI Marketing Manager conversation history. |
| `activityLogs` | Recent activity shown in the dashboard. |

## Local development

The project is designed to run in the managed development environment, where OAuth, database, and built-in AI environment variables are injected automatically. For a compatible local environment, configure the following server-only and client configuration variables through your secure environment manager; do not commit a `.env` file containing production credentials.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Connection string for the MySQL/TiDB-compatible database. |
| `JWT_SECRET` | Server session signing secret. |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Manus OAuth configuration. |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Server-side proxy access for `invokeLLM`; never expose the latter to the browser. |
| `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | Optional configured analytics runtime values. |

Install and run the project with the following commands.

```bash
pnpm install
pnpm drizzle-kit generate
pnpm dev
```

When applying a new schema to a database, generate and review the Drizzle SQL migration first, then apply it through the project’s managed schema workflow. The current MVP migration creates the MASS AI product tables listed above.

## Validation and testing

Run static checks and the test suite before deployment.

```bash
pnpm check
pnpm test
```

The unit suite covers session logout, real-date trial derivation, performance rates computed from actual inputs, authenticated user scoping, native-language Content Studio prompts, and social-image format prompt construction. The public landing page has also been visually reviewed at desktop and mobile widths, and the unauthenticated workspace route has been verified to show its sign-in gate. See `verification-notes.md` for the recorded observations.

## Deployment

Create a project checkpoint after reviewing the completed work, then use the platform’s **Publish** control. The app is compatible with the default autoscaling Node runtime because it does not require persistent workers, long-running processes, or filesystem-based application storage.

## Known limitations

The MVP deliberately does not contain payment processing or a simulated subscription plan. It shows only the calculated trial state. Performance data is entered manually because no social-media API integration is configured. AI responses are delivered in a request-response flow rather than a streaming experience. Image generation uses the configured built-in image service first; if that service fails, the server attempts the keyless Pollinations public image endpoint. End-to-end authenticated browser testing requires a real user to complete the OAuth login flow, so that final account-specific verification should be completed after sign-in.

## Recommended next steps

The next practical enhancements are integrating real social and advertising performance sources, adding a deliberate billing provider after product pricing is defined, adding campaign-detail analytics visualizations, extending permissions for team members, and improving AI guidance retrieval with versioned recommendation history and user feedback.
