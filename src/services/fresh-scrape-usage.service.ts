import { prisma } from "@/lib/db";
import type { AccessTier } from "@/lib/billing/access";
import type { ConditionBucket, ScrapeJobStatus } from "@prisma/client";

export type FreshScrapeEntitlement = {
  allowed: boolean;
  reason: "ok" | "no_user" | "limit_reached";
  remaining: number | null;
  limit: number | null;
  used: number | null;
};

export async function getFreshScrapeEntitlementForUser(input: {
  tier: AccessTier;
  userId: string | null;
}): Promise<FreshScrapeEntitlement> {
  if (input.tier === "collector") {
    return { allowed: true, reason: "ok", remaining: null, limit: null, used: null };
  }
  if (input.tier !== "starter") {
    return { allowed: false, reason: "no_user", remaining: 0, limit: 0, used: 0 };
  }
  if (!input.userId) {
    return { allowed: false, reason: "no_user", remaining: 0, limit: 0, used: 0 };
  }

  const u = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      collectorTierActive: true,
      freeLifetimeUpdatedLookupsLimit: true,
      freeLifetimeUpdatedLookupsUsed: true,
      freeLifetimeUpdatedLookupsReserved: true,
    },
  });
  if (!u) return { allowed: false, reason: "no_user", remaining: 0, limit: 0, used: 0 };
  if (u.collectorTierActive) {
    return { allowed: true, reason: "ok", remaining: null, limit: null, used: null };
  }

  const limit = Math.max(0, u.freeLifetimeUpdatedLookupsLimit);
  const used = Math.max(0, u.freeLifetimeUpdatedLookupsUsed);
  const reserved = Math.max(0, u.freeLifetimeUpdatedLookupsReserved);
  const remaining = Math.max(0, limit - (used + reserved));
  return {
    allowed: remaining > 0,
    reason: remaining > 0 ? "ok" : "limit_reached",
    remaining,
    limit,
    used,
  };
}

/**
 * Reserve one free updated lookup credit (Starter tier).
 * Uses a single atomic UPDATE to protect against concurrent over-reservation.
 */
export async function reserveFreeUpdatedLookupCredit(userId: string): Promise<boolean> {
  const affected = await prisma.$executeRaw`
    UPDATE "User"
    SET "freeLifetimeUpdatedLookupsReserved" = "freeLifetimeUpdatedLookupsReserved" + 1
    WHERE "id" = ${userId}
      AND "collectorTierActive" = false
      AND ("freeLifetimeUpdatedLookupsUsed" + "freeLifetimeUpdatedLookupsReserved") < "freeLifetimeUpdatedLookupsLimit"
  `;
  return Number(affected) > 0;
}

/** Consume one reserved credit after a successful scrape. */
export async function consumeReservedFreeUpdatedLookupCredit(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET
      "freeLifetimeUpdatedLookupsReserved" = GREATEST(0, "freeLifetimeUpdatedLookupsReserved" - 1),
      "freeLifetimeUpdatedLookupsUsed" = "freeLifetimeUpdatedLookupsUsed" + 1
    WHERE "id" = ${userId}
      AND "collectorTierActive" = false
      AND "freeLifetimeUpdatedLookupsReserved" > 0
  `;
}

/** Refund one reserved credit (e.g. scrape failed or job never ran). */
export async function refundReservedFreeUpdatedLookupCredit(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "freeLifetimeUpdatedLookupsReserved" = GREATEST(0, "freeLifetimeUpdatedLookupsReserved" - 1)
    WHERE "id" = ${userId}
      AND "collectorTierActive" = false
      AND "freeLifetimeUpdatedLookupsReserved" > 0
  `;
}

/**
 * If Apify/Vercel died after reserving a credit but no sold job is pending or running, clear the orphan
 * reservation so the user regains that lifetime credit (used+reserved must stay ≤ limit).
 */
export async function releaseOrphanedStarterReservation(userId: string): Promise<void> {
  const inFlight = await prisma.scrapeJob.count({
    where: {
      requestedByUserId: userId,
      kind: "sold",
      status: { in: ["pending", "running"] },
    },
  });
  if (inFlight > 0) return;

  await prisma.$executeRaw`
    UPDATE "User"
    SET "freeLifetimeUpdatedLookupsReserved" = 0
    WHERE "id" = ${userId}
      AND "collectorTierActive" = false
      AND "freeLifetimeUpdatedLookupsReserved" > 0
  `;
}

/**
 * Starter-only: queue a fresh scrape job and reserve exactly one lifetime credit iff this call actually created a job.
 * This ensures:
 * - cache hits don't consume credits (no queue)
 * - concurrency can't over-reserve (atomic update)
 * - deduped in-flight jobs don't double-consume (existing job -> no reserve)
 */
export async function queueStarterFreshScrapeIfAllowed(input: {
  userId: string;
  cardId: string;
  conditionBucket: ConditionBucket;
  cacheKey: string;
  priority: number;
}): Promise<
  | { kind: "queued"; jobId: string; didReserve: true }
  | { kind: "already_queued"; jobId: string }
  | { kind: "not_allowed" }
> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.cacheKey}))`;

    const existing = await tx.scrapeJob.findFirst({
      where: {
        cacheKey: input.cacheKey,
        kind: "sold",
        status: { in: ["pending", "running"] satisfies ScrapeJobStatus[] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return { kind: "already_queued", jobId: existing.id };

    const reserved = await tx.$executeRaw`
      UPDATE "User"
      SET "freeLifetimeUpdatedLookupsReserved" = "freeLifetimeUpdatedLookupsReserved" + 1
      WHERE "id" = ${input.userId}
        AND "collectorTierActive" = false
        AND ("freeLifetimeUpdatedLookupsUsed" + "freeLifetimeUpdatedLookupsReserved") < "freeLifetimeUpdatedLookupsLimit"
    `;
    if (Number(reserved) <= 0) return { kind: "not_allowed" };

    const job = await tx.scrapeJob.create({
      data: {
        cardId: input.cardId,
        conditionBucket: input.conditionBucket,
        cacheKey: input.cacheKey,
        kind: "sold",
        status: "pending",
        requestedByUserId: input.userId,
        priority: input.priority,
      },
      select: { id: true },
    });

    return { kind: "queued", jobId: job.id, didReserve: true };
  });
}

