import { prisma } from "@/lib/db";
import { getScrapeLockTtlMs } from "@/lib/scrape/config";

/**
 * Cost guardrail: one in-flight scrape per logical key (sold cacheKey or active cardVariantId).
 * Uses DB unique constraint + PostgreSQL advisory locks so concurrent requests do not race on
 * delete-then-create (avoids unique violations and noisy Prisma error logs).
 */
export async function tryAcquireScrapeLock(input: {
  scope: "sold" | "active";
  lockKey: string;
  ttlMs?: number;
}): Promise<boolean> {
  const ttlMs = input.ttlMs ?? getScrapeLockTtlMs();
  const expiresAt = new Date(Date.now() + ttlMs);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${input.scope}::text), hashtext(${input.lockKey}::text))
    `;

    await tx.scrapeLock.deleteMany({
      where: {
        scope: input.scope,
        lockKey: input.lockKey,
        expiresAt: { lt: now },
      },
    });

    const existing = await tx.scrapeLock.findUnique({
      where: {
        scope_lockKey: { scope: input.scope, lockKey: input.lockKey },
      },
    });

    if (existing) {
      return false;
    }

    await tx.scrapeLock.create({
      data: { scope: input.scope, lockKey: input.lockKey, expiresAt },
    });
    return true;
  });
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
