import { CACHE_TTL_MS } from "@/lib/constants";

export function isSoldCacheStale(lastScrapedAt: Date, nowMs: number = Date.now()): boolean {
  return nowMs - lastScrapedAt.getTime() >= CACHE_TTL_MS;
}

export function soldCacheFreshUntil(lastScrapedAt: Date): Date {
  return new Date(lastScrapedAt.getTime() + CACHE_TTL_MS);
}
