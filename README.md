# AI Workspace

**The operating system for AI-powered work.** Build, save, run, and reuse AI workflows instead of repeatedly chatting with AI.

## Stack

- **Next.js 14** (App Router) · React 18 · TypeScript (strict)
- **Tailwind CSS + shadcn/ui** — teal/dark-sidebar design system
- **Supabase** — Postgres + Auth + Storage (shared `my-common` project; every table is prefixed `aiw_`, storage buckets `aiw-assets` / `aiw-avatars`)
- **AI providers** — Groq (default), Anthropic, OpenAI, Gemini behind one abstraction (`lib/ai/`)
- **TanStack Query** (server state) · **Zustand** (canvas + onboarding state)
- **Razorpay** subscriptions · **Resend** invites · **Recharts** · **jsPDF / docx / markdown-it** exports

## Getting started

```bash
npm install
npm run dev
```

Then finish two required secrets in `.env.local` (already created with Supabase URL + anon key):

1. `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard → Settings → API → service_role.
   Required for the run engine, admin panel, team invites, and account deletion.
2. `GROQ_API_KEY` — console.groq.com. Required for platform AI runs.

Optional: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`,
Razorpay keys + `RAZORPAY_PLAN_ID_PRO` / `RAZORPAY_PLAN_ID_BUSINESS` (create plans in the
Razorpay dashboard) + `RAZORPAY_WEBHOOK_SECRET` (webhook endpoint: `/api/webhooks/razorpay`).

## Database

All migrations were applied to the `my-common` Supabase project (`aiw_` prefix):
tables, indexes, RLS policies on every table, `updated_at` triggers, a profile-creation
trigger on `auth.users` (grants `is_admin` to `mhsworkonline@gmail.com`), storage buckets,
and seeds (AI settings + 6 starter templates).

`types/database.ts` is hand-maintained to cover only `aiw_` tables — update it alongside
schema changes (or use `npx supabase gen types typescript` and extract the `aiw_` tables).

## Architecture notes

- **Run engine** (`lib/workflow/engine.ts`): server-side topological execution with
  variable interpolation, conditional branches, brand-memory injection, review-block
  pause/resume, cancellation, and per-step persistence. Clients poll the run row.
- **AI factory** (`lib/ai/factory.ts`): user custom key (Pro+) → admin active provider →
  fallback provider. Keys are AES-256-GCM encrypted (`APP_ENCRYPTION_KEY`) at rest.
- **Plan limits** (`lib/limits.ts`): runs/month, workflows, projects, storage, team size
  enforced in API routes; hitting a limit returns `upgrade: true` and the UI shows an
  upgrade prompt instead of an error.
- **Runs are fire-and-forget** from `/api/workflows/[id]/run`. On serverless hosts,
  long runs may need `waitUntil`/background functions; fine in `next dev` and Node hosts.

## Admin

`/admin` is restricted to profiles with `is_admin = true`. The seeded admin is the
`mhsworkonline@gmail.com` account (sign up with that email). Admin can switch the
platform AI provider, manage users/plans, toggle templates, and read audit logs.
