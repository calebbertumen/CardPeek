/**
 * Product rules — single source of truth for plan limits and pricing display.
 * Adjust values here; avoid scattering magic numbers across UI and services.
 */

export const STARTER_DAILY_SEARCH_LIMIT = 7;
export const STARTER_WATCHLIST_LIMIT = 3;
export const COLLECTOR_WATCHLIST_LIMIT = 25;
export const COLLECTOR_PRICE_MONTHLY_USD = 6.99;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Internal only: when cache is missing, Starter may receive up to this many automatic
 * market-data lookups per UTC day. Not shown in UI. Set env to `0` to disable without copy changes.
 */
export function getStarterHiddenLiveFetchesPerDay(): number {
  return envInt("STARTER_HIDDEN_LIVE_FETCHES_PER_DAY", 1);
}

/** Display / Stripe-adjacent default; can override with COLLECTOR_PRICE_MONTHLY_USD in env. */
export function getCollectorPriceMonthlyUsd(): number {
  return envNumber("COLLECTOR_PRICE_MONTHLY_USD", COLLECTOR_PRICE_MONTHLY_USD);
}
