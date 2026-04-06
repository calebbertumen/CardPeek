import { prisma } from "@/lib/db";
import { getScrapeLockTtlMs } from "@/lib/scrape/config";

/**
 * Cost guardrail: one in-flight scrape per logical key (sold cacheKey or active cardVariantId).
 * Uses DB unique constraint — no Redis required for MVP.
 */
export async function tryAcquireScrapeLock(input: {
  scope: "sold" | "active";
  lockKey: string;
  ttlMs?: number;
}): Promise<boolean> {
  const ttlMs = input.ttlMs ?? getScrapeLockTtlMs();
  const expiresAt = new Date(Date.now() + ttlMs);
  try {
    await prisma.scrapeLock.create({
      data: { scope: input.scope, lockKey: input.lockKey, expiresAt },
    });
    return true;
  } catch {
    return false;
  }
}

export async function releaseScrapeLock(input: { scope: "sold" | "active"; lockKey: string }): Promise<void> {
  await prisma.scrapeLock.deleteMany({
    where: { scope: input.scope, lockKey: input.lockKey },
  });
}

export async function deleteExpiredScrapeLocks(): Promise<number> {
  const res = await prisma.scrapeLock.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return res.count;
}
