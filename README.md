# CardPeek

Production-minded MVP for **Pokémon card sold comps**: search by name (plus optional set and number), pick a **condition bucket**, and see the **canonical card image** (Pokémon TCG API) with up to **five recent sold listings**, **cached for 24 hours** to limit scraping cost.

- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn-style UI (Radix + CVA), Prisma 6, PostgreSQL, Auth.js (credentials), Stripe-ready `Subscription` model (no payments wired).

## Prerequisites

- Node.js 20+ recommended
- PostgreSQL database

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` and `AUTH_SECRET` (e.g. `openssl rand -base64 32`). Never commit `.env` — it is listed in `.gitignore`; only `.env.example` belongs in the repo.

3. **Database schema**

   ```bash
   npx prisma db push
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Product behavior

- **Anonymous usage:** HTTP-only cookie `cardpeek_aid`; **3 searches per 30-day rolling window** (when limits are enabled), then sign-up is required. Limits are disabled in `development` or when `DISABLE_ANONYMOUS_SEARCH_LIMIT=true`. Only **form submits** count toward the quota, not `/search?name=…` SSR loads.
- **Signed-in users:** unlimited searches (tracked by `userId` where applicable; anonymous counter skipped).
- **Cache:** `CardCache` keyed by `normalizedCardKey__condition`; **TTL 24h**; listings are **replaced** on refresh (no accumulation of old rows).
- **Sold comps:** `getSoldCompsProvider()` returns a **mock provider** with TODO for Apify / eBay integration (`src/services/sold-comps/`).

## Scripts

| Command            | Description                |
| ------------------ | -------------------------- |
| `npm run dev`      | Development server         |
| `npm run build`    | Production build           |
| `npm run start`    | Start production server    |
| `npm run lint`     | ESLint                     |
| `npm run db:push`  | Push Prisma schema to DB   |
| `npm run db:studio`| Prisma Studio              |

## Project layout (high level)

- `src/app/` — routes (marketing home, search, auth, dashboard, pricing, legal).
- `src/actions/` — server actions (search, auth).
- `src/services/` — Pokémon TCG client, sold-comps provider, cache orchestration.
- `src/components/` — layout, landing, search UI, auth forms.
- `prisma/schema.prisma` — data model including Auth.js tables and Stripe placeholder.

## Extending to other TCGs

Card and provider layers are named to allow a future **generic TCG** interface (e.g. shared `TcgCard` lookup + provider registry) without changing the cache or UI flow.
