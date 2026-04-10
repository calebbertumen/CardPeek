/**
 * @param ttlMs adaptive sold-cache TTL for this card (from {@link getCardCachePolicy}).
 */
export function isSoldCacheFresh(
  lastScrapedAt: Date,
  nowMs: number = Date.now(),
  ttlMs: number,
): boolean {
  return nowMs - lastScrapedAt.getTime() < ttlMs;
}
