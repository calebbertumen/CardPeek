export function getScrapeLockTtlMs(): number {
  const n = Number(process.env.SCRAPE_LOCK_TTL_MS ?? String(10 * 60 * 1000));
  return Math.min(Math.max(Number.isFinite(n) ? n : 600_000, 30_000), 60 * 60 * 1000);
}
