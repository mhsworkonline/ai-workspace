# CLAUDE.md

AI Workspace — a Next.js 14 (App Router) SaaS where users build AI workflows on a visual
canvas, run them server-side, and reuse outputs. Read `README.md` first for setup and env
vars; this file covers what the code alone won't tell you.

## Architecture in one paragraph

Pages live in route groups (`(auth)`, `(onboarding)`, `(dashboard)`, `(admin)`); groups
don't affect URLs, so onboarding steps are top-level paths like `/welcome` — any new
protected page must also be added to `PROTECTED_PREFIXES` in `middleware.ts` or it will be
publicly reachable. Client components never call Supabase tables for writes directly;
they go through API routes (`app/api/*`) using the `{ data } | { error, upgrade }`
envelope (`lib/server/auth.ts` on the server, `lib/api/http.ts` + TanStack Query hooks in
`hooks/` on the client). Exception: `lib/api/workspace.ts#fetchSession` reads Supabase
directly from the browser. Zustand holds only ephemeral UI state (canvas editing,
onboarding wizard); everything durable is Postgres.

## Database (critical constraint)

- All tables live in a **shared** Supabase project (`my-common`) used by several
  unrelated apps. Every AI Workspace table is prefixed `aiw_`, buckets `aiw-assets` /
  `aiw-avatars`. **Never** create/modify objects without the prefix, and never assume
  this project's tables are the only ones in the DB.
- Table names only via the `TABLES` constant (`lib/constants.ts`) — no string literals.
- `types/database.ts` is **hand-maintained**, not generated. Any migration must be
  mirrored there (and in `TABLES` if a table is added). Migrations are applied via the
  Supabase MCP tools / dashboard; there is no local migrations folder.
- A DB trigger on `auth.users` creates `aiw_profiles` rows on INSERT and grants
  `is_admin` to `mhsworkonline@gmail.com`. Because the Supabase project is shared, auth
  accounts can pre-date this app and have **no profile row**; `fetchSession` lazily
  creates one (this fixed a "dashboard stuck on skeletons" bug — don't remove it).
- Two Supabase clients: RLS-scoped (`lib/supabase/server.ts` via `getAuthedContext`) for
  user-initiated API routes; service-role (`lib/supabase/admin.ts`) for the run engine,
  AI factory, admin panel, webhooks, invites, account deletion. Routes using the admin
  client must do their own authorization — RLS won't save you there.

## Run engine (`lib/workflow/engine.ts`) — the fragile core

- `POST /api/workflows/[id]/run` inserts a run row, increments usage, then calls
  `executeRun(runId)` **fire-and-forget**; the client polls the run row every 1.5s
  (`RUN_POLL_INTERVAL_MS`). On serverless hosts the detached promise can be killed —
  use `waitUntil`/background functions if deploying to Vercel. Fine on Node/`next dev`.
- Execution order = topological sort with (x, y) canvas position as tiebreak. Cycles
  aren't rejected; cyclic blocks are appended and fail at runtime.
- Condition blocks mark untaken branches as "dead edges"; downstream blocks whose
  incoming edges are all dead get status `skipped`. A block with some live inputs joins
  them with `\n\n---\n\n`; with none, it falls back to the run's input text.
- **Resume is state reconstruction**: Review blocks pause the run
  (`status = awaiting_review`), and `applyReviewDecision` re-invokes `executeRun`, which
  rebuilds `deadEdges` and completed outputs from the persisted `steps` JSON on the run
  row. If you add block types or change step shapes, verify the resume path, not just
  fresh runs. Cancellation is checked by re-reading run status before each block.
- Export blocks don't export server-side — they tag the step with
  `exportSubtype`/`exportFilename` and the client renders the file (jsPDF/docx/
  markdown-it in `lib/utils/export.ts`). Integration blocks exist in the UI but the
  engine throws "coming soon".
- Variable precedence (later wins): workspace-scoped < project < workflow-scoped DB
  variables < `workflow.variables` < run input variables; brand-memory entries fill only
  *undefined* keys; system variables (`current_date`, `user_name`, …) are assigned last
  and always win. `{{unknown}}` tokens are left in place, never errors.

## AI provider layer

- `resolveAIProvider` (`lib/ai/factory.ts`) order: user's own key (Pro/Business with
  `use_custom_provider`) → admin-selected active provider → admin fallback provider.
  Admin keys live as key/value rows in `aiw_admin_settings` (see `ADMIN_SETTING_KEYS`),
  falling back to env vars (`GROQ_API_KEY` etc.). Bad/undecryptable user keys silently
  fall through to the platform provider — intentional.
- All stored API keys (admin + user) are AES-256-GCM encrypted with
  `APP_ENCRYPTION_KEY` (64 hex chars) via `lib/utils/encrypt.ts`, format
  `iv.tag.ciphertext` base64. Rotating the key orphans every stored secret.
- `AI_PROVIDER_MODELS` in `lib/constants.ts` is the **single source of truth** for every
  model dropdown and default (`defaultModelFor` = first catalog entry). A hardcoded
  model id elsewhere already caused a production break when Groq decommissioned a model —
  keep everything reading from the catalog, and expect catalog entries to rot.

## Billing & limits

- Razorpay subscriptions; the workspace id travels in the subscription `notes` and comes
  back through the HMAC-verified webhook (`app/api/webhooks/razorpay/route.ts`), which is
  excluded from auth middleware. Plan-id → tier mapping is env-driven
  (`RAZORPAY_PLAN_ID_PRO`/`_BUSINESS`, `lib/server/razorpay.ts`). Cancel/expire drops the
  workspace to Free.
- `lib/limits.ts` checks are enforced **in API routes only** (there is no DB-level
  enforcement). A blocked action returns `upgrade: true`; `ApiError.upgrade` drives the
  upsell UI (`components/shared/upgrade-prompt.tsx`) instead of an error toast — keep
  that contract when adding limits.
- Known gaps (intentional debt): usage counters reset only on the
  `subscription.charged` webhook, so **Free workspaces never auto-reset monthly**
  (needs a cron); `tokensPerMonth` is tracked (`tokens_used_this_month`) but never
  enforced; run count increments at start and isn't refunded on failure; the Review
  block's `timeoutHours` is stored but nothing enforces it.

## Canvas

`components/workflow/canvas.tsx` is a **hand-rolled** canvas (absolutely-positioned divs
+ SVG bezier edges), not react-flow. State in `stores/canvas.store.ts` (zustand): snap to
16px grid, 50-snapshot undo history, condition blocks expose `"true"/"false"` source
handles. Block metadata for the picker/settings lives in
`components/workflow/block-defs.ts`.

## Maintenance map

- **New block type** → `types/workflow.ts` (enum + data interface),
  `components/workflow/block-defs.ts`, `block-settings.tsx`, `engine.ts#executeBlock`,
  and check the resume path.
- **Schema change** → migration on `my-common` (aiw_ prefix + RLS + `updated_at`
  trigger) + `types/database.ts` + `TABLES`.
- **New AI provider** → `lib/ai/providers/*` implementing `AIProvider`,
  `AIProviderName` + `AI_PROVIDER_MODELS` in constants, `instantiateProvider` in factory.
- **New page under the dashboard** → also `PROTECTED_PREFIXES` in `middleware.ts` and
  the sidebar nav (`components/layout/sidebar-nav.tsx`).
- **Plan/pricing change** → `PLAN_LIMITS` in constants + Razorpay plan env vars; UI
  reads limits from constants, never hardcodes them.
- **New API route** → return via `jsonData`/`jsonError` (`lib/server/auth.ts`), add a
  client fn in `lib/api/*` and a TanStack Query hook in `hooks/`.

## Misc

- `/admin` is gated by `profiles.is_admin` (checked in `app/(admin)/layout.tsx` and
  `getAdminContext` for its API routes), not by middleware.
- Team invites email via Resend (optional env; invites still get created without it).
- `node deploy.js` pushes to GitHub (thin git wrapper, supports `--force`, `--branch=`).
- No test suite exists. Verify by running `npm run build` and exercising flows in
  `npm run dev`.
