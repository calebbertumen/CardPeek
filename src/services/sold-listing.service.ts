import type { ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildCacheKey } from "@/lib/normalize";
import { isSoldCacheStale } from "@/lib/scrape/staleness";
import { getCardCachePolicy, cachePolicyTtlMs } from "@/lib/cache/card-cache-policy";
import { getCardSearchStats } from "@/services/card-search-activity.service";

/**
 * Sold comps: read-only helpers. External fetches must go through the scrape queue + worker
 * (never per-user; deduped by cacheKey + ScrapeJob + optional ScrapeLock).
 */
export async function getSoldCacheState(input: {
  normalizedCardKey: string;
  conditionBucket: ConditionBucket;
}): Promise<
  | { kind: "missing" }
  | { kind: "fresh"; lastScrapedAt: Date }
  | { kind: "stale"; lastScrapedAt: Date }
> {
  const cacheKey = buildCacheKey(input.normalizedCardKey, input.conditionBucket);
  const row = await prisma.cardCache.findUnique({
    where: { cacheKey },
    select: { lastScrapedAt: true },
  });
  if (!row) return { kind: "missing" };

  const stats = await getCardSearchStats(input.normalizedCardKey);
  const policy = getCardCachePolicy(stats);
  const ttlMs = cachePolicyTtlMs(policy);

  return isSoldCacheStale(row.lastScrapedAt, Date.now(), ttlMs)
    ? { kind: "stale", lastScrapedAt: row.lastScrapedAt }
    : { kind: "fresh", lastScrapedAt: row.lastScrapedAt };
}
