# Scraping cost controls (CardPeek)

This document describes how CardPeek limits scraping spend as usage grows. The design goal is **one scrape per canonical card variant**, shared by every user watching that card.

## Two systems

1. **Sold listings** — comps and pricing (`CardCache` + `CardCacheListing`). Triggered only when cache is missing or past TTL (or explicit Collector refresh via the scrape queue). Never per user.
2. **Active listings** — watchlist alerts only (`ActiveListingSnapshot` + `ActiveListingRow`). Triggered by scheduled jobs (`/api/jobs/watchlist-active-checks`), not by page views. Optional **piggyback** when a sold job runs for a variant that has watchers (does not replace scheduled checks).

## Deduplication

- **Scrape jobs (sold)** — `ScrapeJob` rows with `kind: sold` are deduped by `cacheKey` while `pending` or `running`.
- **Locks** — `ScrapeLock` with `scope` `sold` | `active` prevents duplicate concurrent provider calls for the same key (survives multiple app instances once DB is shared).
- **Alerts** — `WatchlistAlertHistory` unique on `(userId, cardVariantId, listingItemId)` ensures one notification per listing per user.

## Tier-aware alert cadence

- **Collector (paid)** — shorter interval via `WATCHLIST_ACTIVE_INTERVAL_PAID_MS` (default 3h).
- **Starter (free)** — longer interval via `WATCHLIST_ACTIVE_INTERVAL_FREE_MS` (default 10h).

Intervals apply when **bumping** `nextActiveCheckAfter` after a successful scheduled scrape for that user’s watchlist row. Piggyback refreshes do not bump schedules.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | If set, `POST /api/jobs/watchlist-active-checks` requires `Authorization: Bearer <secret>`. |
| `ACTIVE_LISTINGS_MAX_PER_SCRAPE` | Cap rows stored per active snapshot (default 10). |
| `WATCHLIST_MAX_VARIANTS_PER_CYCLE` | Max distinct variants per scheduler run (default 50). |
| `WATCHLIST_ACTIVE_INTERVAL_PAID_MS` | Paid tier spacing between checks (default 3h). |
| `WATCHLIST_ACTIVE_INTERVAL_FREE_MS` | Free tier spacing (default 10h). |
| `SCRAPE_LOCK_TTL_MS` | Lock lifetime if a worker crashes mid-job (default 10m). |
| `ACTIVE_SCRAPE_MAX_RETRIES` | Retries for a single active fetch (default 2, max 5). |
| `PIGGYBACK_ACTIVE_ON_SOLD` | Set to `false` to disable active fetch after sold scrape (default on). |
| `SCRAPING_PROVIDER` | `mock` (default) or `apify`. |
| `APIFY_ACTOR_ACTIVE_ID` | Optional separate actor for active/BIN; falls back to `APIFY_ACTOR_ID`. |

## Risks and scaling

- **Unique variants** — cost grows with `COUNT(DISTINCT cardVariantId on watchlist with alerts)`, not raw user count.
- **Provider bills** — Apify (or any actor) is the main variable cost; keep `ACTIVE_LISTINGS_MAX_PER_SCRAPE` and `WATCHLIST_MAX_VARIANTS_PER_CYCLE` conservative until metrics exist.
- **Locks** — rely on DB; under extreme load consider Redis for lower lock contention (not required for early scale).
- **Starter** — `watchlistLimit` 3; **Collector** — 25 tracked cards and `maxActiveAlerts` 25 (aligned with pricing copy).
- **Collector** daily search soft cap is high (`10_000`) for “effectively unlimited” usage while still bounding abuse.
