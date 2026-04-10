export function isSoldCacheStale(
  lastScrapedAt: Date,
  nowMs: number = Date.now(),
  ttlMs: number,
): boolean {
  return nowMs - lastScrapedAt.getTime() >= ttlMs;
}

export function soldCacheFreshUntil(lastScrapedAt: Date, ttlMs: number): Date {
  return new Date(lastScrapedAt.getTime() + ttlMs);
}
