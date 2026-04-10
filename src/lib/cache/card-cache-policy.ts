/**
 * Adaptive sold-cache TTL from per-card search activity (normalized card key).
 * Tune thresholds in this file only.
 */

export type CardSearchStats = {
  lastSearchedAt: Date | null;
  searchCount24h: number;
  searchCount7d: number;
  searchCount30d: number;
  uniqueUsers7d: number;
};

export type CacheTemperature = "hot" | "default" | "cold";

export type CachePolicyResult = {
  temperature: CacheTemperature;
  ttlHours: number;
  reasons: string[];
};

const TTL_HOT_H = 24;
const TTL_DEFAULT_H = 48;
const TTL_COLD_H = 72;

/** Hot: enough recent interest to refresh comps more often. */
const HOT_SEARCH_COUNT_7D = 5;
const HOT_UNIQUE_USERS_7D = 3;
const HOT_SEARCH_COUNT_24H = 2;

/**
 * Classify TTL using stats **before** the current search is recorded.
 * Cold: at most one search in the last 30d and none in the last 7d (dormant interest).
 */
export function getCardCachePolicy(stats: CardSearchStats): CachePolicyResult {
  const reasons: string[] = [];

  const hotBy7d = stats.searchCount7d >= HOT_SEARCH_COUNT_7D;
  if (hotBy7d) reasons.push(`searchCount7d>=${HOT_SEARCH_COUNT_7D}`);

  const hotBy24h = stats.searchCount24h >= HOT_SEARCH_COUNT_24H;
  if (hotBy24h) reasons.push(`searchCount24h>=${HOT_SEARCH_COUNT_24H}`);

  const hotByUsers = stats.uniqueUsers7d >= HOT_UNIQUE_USERS_7D;
  if (hotByUsers) reasons.push(`uniqueUsers7d>=${HOT_UNIQUE_USERS_7D}`);

  if (hotBy7d || hotBy24h || hotByUsers) {
    return { temperature: "hot", ttlHours: TTL_HOT_H, reasons };
  }

  const cold =
    stats.searchCount30d <= 1 && stats.searchCount7d === 0;
  if (cold) {
    reasons.push("searchCount30d<=1", "searchCount7d===0");
    return { temperature: "cold", ttlHours: TTL_COLD_H, reasons };
  }

  reasons.push("default_bucket");
  return { temperature: "default", ttlHours: TTL_DEFAULT_H, reasons };
}

export function cachePolicyTtlMs(policy: CachePolicyResult): number {
  return policy.ttlHours * 60 * 60 * 1000;
}
