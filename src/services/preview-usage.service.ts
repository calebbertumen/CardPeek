import { prisma } from "@/lib/db";

/** Same card + condition retried within this window counts once (duplicate server invocations). */
const PREVIEW_DEBIT_DEDUPE_MS = 400;

export async function enforceAndRecordPreviewSearch(input: {
  anonymousId: string;
  limitTotal: number;
  /** Stable id for this successful cache display (e.g. normalizedCardKey + condition bucket). */
  debitFingerprint: string;
}): Promise<{ ok: true; remaining: number } | { ok: false; remaining: 0 }> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(abs(hashtext(${input.anonymousId}::text))::bigint)`;

    const row = await tx.previewUsage.findUnique({
      where: { anonymousId: input.anonymousId },
      select: {
        searches: true,
        lastDebitFingerprint: true,
        lastDebitAt: true,
      },
    });

    const used = row?.searches ?? 0;

    if (
      row?.lastDebitFingerprint === input.debitFingerprint &&
      row.lastDebitAt &&
      Date.now() - row.lastDebitAt.getTime() < PREVIEW_DEBIT_DEDUPE_MS
    ) {
      if (used > input.limitTotal) return { ok: false, remaining: 0 };
      return { ok: true, remaining: Math.max(0, input.limitTotal - used) };
    }

    if (used >= input.limitTotal) {
      return { ok: false, remaining: 0 };
    }

    const updated = await tx.previewUsage.upsert({
      where: { anonymousId: input.anonymousId },
      create: {
        anonymousId: input.anonymousId,
        searches: 1,
        lastDebitFingerprint: input.debitFingerprint,
        lastDebitAt: new Date(),
      },
      update: {
        searches: { increment: 1 },
        lastDebitFingerprint: input.debitFingerprint,
        lastDebitAt: new Date(),
      },
      select: { searches: true },
    });

    const remaining = Math.max(0, input.limitTotal - updated.searches);
    if (updated.searches > input.limitTotal) return { ok: false, remaining: 0 };
    return { ok: true, remaining };
  });
}
