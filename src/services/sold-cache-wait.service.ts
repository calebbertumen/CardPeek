import { prisma } from "@/lib/db";
import { isSoldCacheFresh } from "@/lib/sold-cache/cache-fresh";

const POLL_MS = 400;
const DEFAULT_TIMEOUT_MS = 45_000;

/**
 * After a scrape was queued, poll until CardCache exists with `lastScrapedAt` within the adaptive TTL
 * or timeout. `ttlMs` must match the policy used to decide the cache was stale.
 */
export async function waitForFreshSoldCache(input: {
  cacheKey: string;
  ttlMs: number;
  timeoutMs?: number;
}): Promise<boolean> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const row = await prisma.cardCache.findUnique({
      where: { cacheKey: input.cacheKey },
      select: { lastScrapedAt: true },
    });
    if (row && isSoldCacheFresh(row.lastScrapedAt, Date.now(), input.ttlMs)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  return false;
}
