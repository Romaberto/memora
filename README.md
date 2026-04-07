# Memorize

Memorize is a learning SaaS scaffold (placeholder name) built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma + SQLite**, and **OpenAI** for quiz generation. There is **no sign-in** for now: the app uses a single **guest user** in the database so the dashboard and APIs work without auth. You can **swap SQLite for Postgres** by changing the Prisma `datasource` and `DATABASE_URL`.

## Requirements

- **Node.js 18.17+** (recommended: current LTS)
- npm (or pnpm/yarn if you adapt commands)
- An **OpenAI API key** (optional; without it the app uses a built-in fallback quiz)

## Quick start

```bash
cd memorize
cp .env.example .env

npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Go straight to **[/dashboard](/dashboard)** — no login.

### First-time database

- `npx prisma migrate dev` creates SQLite at `prisma/dev.db` (when `DATABASE_URL="file:./dev.db"`).
- `npm run db:seed` ensures the shared **guest** user (`guest@memorize.local`) exists (also created on first API use via `getGuestUserId()`).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string |
| `OPENAI_API_KEY` | Server-side quiz generation |
| `OPENAI_QUIZ_MODEL` | Optional model override (default `gpt-4o-mini`) |

Place values in **`.env`** (never commit it).

## Guest / no-auth behavior

- All quiz data is associated with one `User` row (`guest@memorize.local`).
- **Anyone** hitting your local (or deployed) instance shares that history. Fine for solo local dev; add real auth before production multi-user use.

## Switching to Postgres

1. In `prisma/schema.prisma`, set `provider = "postgresql"` and `url = env("DATABASE_URL")`.
2. Set `DATABASE_URL` to your Postgres URL.
3. Run `npx prisma migrate dev`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build & start |
| `npm run lint` | ESLint |
| `npx prisma migrate dev` | Create/apply migrations |
| `npx prisma studio` | Browse SQLite/Postgres data |
| `npm run db:seed` | Run `prisma/seed.ts` |

## Product flow

1. **Landing** (`/`) — marketing page; CTAs go to `/dashboard`.
2. **Dashboard** (`/dashboard`) — enter title / summary / notes, pick question count, **Generate quiz**.
3. **Quiz** (`/dashboard/quiz/[requestId]`) — one question at a time, feedback, score, animations.
4. **Results** — saved via `POST /api/quiz/complete`.
5. **Review** (`/dashboard/session/[sessionId]`) — per-question breakdown.

### API routes

- `POST /api/generate-quiz` — Zod-validated body, AI or fallback quiz, persists `QuizRequest` + `QuizQuestion`.
- `POST /api/quiz/complete` — saves `QuizSession` + `QuizAnswer`.
- `POST /api/regenerate-quiz` — new quiz from an existing request’s inputs.

### Fallback without OpenAI

If `OPENAI_API_KEY` is missing or the model call fails, the server uses a **sample quiz** so the full UI still works.

### Development-only debug

On the dashboard form, enable **“Debug: return generation prompt”** (in development) to copy the prompt JSON after generation.

## Renaming the product

- **Header**: `src/components/site-header.tsx`
- **Metadata**: `src/app/layout.tsx`
- **Package name**: `package.json` `"name"`
- **Landing copy**: `src/components/landing/landing-page.tsx`

## Where things live

| Area | Location |
|------|-----------|
| **Guest user** | `src/lib/guest-user.ts` |
| **AI** | `src/lib/ai.ts`, `src/lib/quiz-generator.ts` |
| **Zod** | `src/lib/schemas/quiz.ts` |
| **Database** | `prisma/schema.prisma`, `src/lib/db.ts` |
| **Landing** | `src/components/landing/landing-page.tsx`, `src/app/page.tsx` |
| **Dashboard** | `src/app/dashboard/page.tsx`, `src/components/dashboard/dashboard-view.tsx` |
| **Quiz UX** | `src/components/quiz/quiz-experience.tsx` |
| **Ranks** | `src/lib/ranks.ts` |

## License

Private / your choice — not specified in this scaffold.
