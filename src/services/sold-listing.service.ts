import type { ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildCacheKey } from "@/lib/normalize";
import { isSoldCacheStale } from "@/lib/scrape/staleness";

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
  return isSoldCacheStale(row.lastScrapedAt)
    ? { kind: "stale", lastScrapedAt: row.lastScrapedAt }
    : { kind: "fresh", lastScrapedAt: row.lastScrapedAt };
}
