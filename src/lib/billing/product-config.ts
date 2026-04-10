/**
 * Product rules — single source of truth for plan limits and pricing display.
 * Adjust values here; avoid scattering magic numbers across UI and services.
 */

export const STARTER_DAILY_SEARCH_LIMIT = 1;
export const COLLECTOR_PRICE_MONTHLY_USD = 9.99;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Display / Stripe-adjacent default; can override with COLLECTOR_PRICE_MONTHLY_USD in env. */
export function getCollectorPriceMonthlyUsd(): number {
  return envNumber("COLLECTOR_PRICE_MONTHLY_USD", COLLECTOR_PRICE_MONTHLY_USD);
}
