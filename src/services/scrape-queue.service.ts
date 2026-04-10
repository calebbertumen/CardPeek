import type { ConditionBucket, ScrapeJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function queueScrapeRefreshIfNeeded(input: {
  cardId: string;
  conditionBucket: ConditionBucket;
  cacheKey: string;
  requestedByUserId: string | null;
  /** Higher = sooner. */
  priority: number;
}): Promise<{ didQueue: boolean; alreadyQueued: boolean; jobId?: string }> {
  return prisma.$transaction(async (tx) => {
    // Prevent duplicate pending/running jobs for the same cacheKey under concurrency.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.cacheKey}))`;

    const existing = await tx.scrapeJob.findFirst({
      where: {
        cacheKey: input.cacheKey,
        kind: "sold",
        status: { in: ["pending", "running"] satisfies ScrapeJobStatus[] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });

    if (existing) {
      return { didQueue: false, alreadyQueued: true, jobId: existing.id };
    }

    const job = await tx.scrapeJob.create({
      data: {
        cardId: input.cardId,
        conditionBucket: input.conditionBucket,
        cacheKey: input.cacheKey,
        kind: "sold",
        status: "pending",
        requestedByUserId: input.requestedByUserId,
        priority: input.priority,
      },
      select: { id: true },
    });

    return { didQueue: true, alreadyQueued: false, jobId: job.id };
  });
}

