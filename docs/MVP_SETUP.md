# CardPeek MVP setup (Scraping + Stripe)

This MVP is intentionally simple and cost-safe:
- **Preview/Starter** users are **DB-only** (no scraping, no refresh jobs, no external fetches).
- **Collector** users can queue a refresh **only when data is missing or stale** (TTL 24h).
- Alerts trigger **only when new DB data is processed** (not real-time).

## Scraping setup

### Environment variables

- `SCRAPING_PROVIDER` = `mock` (default) or `apify`
- If using Apify:
  - `APIFY_TOKEN`
  - `APIFY_ACTOR_ID`

### Where the real provider plugs in

- Provider selection: `src/lib/scraping/provider.ts`
- Apify integration skeleton: `src/lib/scraping/apify.ts`
  - **TODO:** adjust actor input + output mapping to match your Apify actor.

### How jobs are triggered

- On **Collector search** when cached data is **missing or stale**, the app queues a job:
  - `src/services/scrape-queue.service.ts`

### How jobs are processed

- MVP worker function: `src/services/scrape-worker.service.ts`
- Worker endpoint (cron-friendly): `POST /api/jobs/process-scrapes`
  - `src/app/api/jobs/process-scrapes/route.ts`

You can run it locally by hitting:

```bash
curl -X POST http://localhost:3000/api/jobs/process-scrapes
```

### Snapshot storage rule (MVP)

On each successful scrape:
- store **exactly 5** sold listings (most recent sold)
- replace the previous 5 rows
- recompute avg/min/max and update `lastScrapedAt`

This is implemented in:
- `src/services/scrape-worker.service.ts`
- tables: `CardCache` + `CardCacheListing`

## Stripe setup (Collector subscription)

### Environment variables

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_COLLECTOR_PRICE_ID` (subscription price id, e.g. `price_...`)
- Optional: `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)

### Checkout flow

- Create checkout session: `POST /api/stripe/checkout`
  - `src/app/api/stripe/checkout/route.ts`
- Pricing page uses: `src/components/billing/stripe-checkout-button.tsx`

### Webhook provisioning (source of truth)

- Webhook endpoint: `POST /api/stripe/webhook`
  - `src/app/api/stripe/webhook/route.ts`
- Provisioning logic: `src/services/billing/stripe-provisioning.ts`

Collector access is granted when DB shows:
- `Subscription.status === "active"` and `Subscription.planId === "collector"`

### Local webhook testing

Use the Stripe CLI to forward events to:
- `http://localhost:3000/api/stripe/webhook`

Then:
- start a checkout session from the Pricing page (logged in)
- complete checkout
- confirm the webhook updates the `Subscription` row

