/** Anonymous searches allowed per rolling window before signup is required (when limits are on) */
export const ANONYMOUS_SEARCH_LIMIT = 3;

/** Rolling window for anonymous quota reset */
export const ANONYMOUS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * When true: no anonymous quota check or counter updates.
 * Default on in development; set DISABLE_ANONYMOUS_SEARCH_LIMIT=true in .env to disable in any environment.
 */
export function isAnonymousSearchLimitDisabled(): boolean {
  if (process.env.DISABLE_ANONYMOUS_SEARCH_LIMIT === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

/** Sold comps cache TTL is adaptive per normalized card key — see `getCardCachePolicy`. */

export const ANONYMOUS_COOKIE = "cardpeek_aid";
