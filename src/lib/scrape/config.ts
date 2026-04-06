/** Max active listings stored per variant scrape (cost cap). */
export function getActiveListingsMaxPerScrape(): number {
  const n = Number(process.env.ACTIVE_LISTINGS_MAX_PER_SCRAPE ?? "10");
  return Math.min(Math.max(Number.isFinite(n) ? n : 10, 1), 50);
}

/** Max distinct card variants processed in one scheduler run. */
export function getWatchlistMaxVariantsPerCycle(): number {
  const n = Number(process.env.WATCHLIST_MAX_VARIANTS_PER_CYCLE ?? "50");
  return Math.min(Math.max(Number.isFinite(n) ? n : 50, 1), 500);
}

export function getWatchlistActiveIntervalPaidMs(): number {
  const n = Number(process.env.WATCHLIST_ACTIVE_INTERVAL_PAID_MS ?? String(3 * 60 * 60 * 1000));
  return Math.min(Math.max(Number.isFinite(n) ? n : 3 * 60 * 60 * 1000, 60_000), 48 * 60 * 60 * 1000);
}

export function getWatchlistActiveIntervalFreeMs(): number {
  const n = Number(process.env.WATCHLIST_ACTIVE_INTERVAL_FREE_MS ?? String(10 * 60 * 60 * 1000));
  return Math.min(Math.max(Number.isFinite(n) ? n : 10 * 60 * 60 * 1000, 60_000), 7 * 24 * 60 * 60 * 1000);
}

export function getScrapeLockTtlMs(): number {
  const n = Number(process.env.SCRAPE_LOCK_TTL_MS ?? String(10 * 60 * 1000));
  return Math.min(Math.max(Number.isFinite(n) ? n : 600_000, 30_000), 60 * 60 * 1000);
}

export function isPiggybackActiveOnSoldEnabled(): boolean {
  return process.env.PIGGYBACK_ACTIVE_ON_SOLD !== "false";
}

export function getActiveFetchMaxRetries(): number {
  const n = Number(process.env.ACTIVE_SCRAPE_MAX_RETRIES ?? "2");
  return Math.min(Math.max(Number.isFinite(n) ? n : 2, 0), 5);
}

export function intervalMsForUserPlan(plan: "starter" | "collector"): number {
  const paid = getWatchlistActiveIntervalPaidMs();
  const free = getWatchlistActiveIntervalFreeMs();
  return plan === "collector" ? paid : free;
}
