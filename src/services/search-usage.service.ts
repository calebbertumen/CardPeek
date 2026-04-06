import { prisma } from "@/lib/db";
import type { Entitlements } from "@/lib/billing/entitlements";

function dayKeyUtc(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function areSearchLimitsDisabled(): boolean {
  if (process.env.DISABLE_SEARCH_LIMITS === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export async function enforceAndRecordDailySearch(input: {
  entitlements: Entitlements;
  userId?: string | null;
  anonymousId?: string | null;
}): Promise<{ ok: true } | { ok: false; limit: number }> {
  const limitsOff = areSearchLimitsDisabled();
  if (limitsOff) return { ok: true };

  // Preview mode is handled separately (lifetime total searches).
  if (input.entitlements.tier === "preview") return { ok: true };

  const key = dayKeyUtc();

  // Collector: soft cap; we still enforce in backend for safety.
  const limit = input.entitlements.searchesPerDaySoftCap;

  if (input.userId) {
    const row = await prisma.searchUsage.upsert({
      where: { dayKey_userId: { dayKey: key, userId: input.userId } },
      create: { dayKey: key, userId: input.userId, searches: 1 },
      update: { searches: { increment: 1 } },
      select: { searches: true },
    });
    if (row.searches > limit) return { ok: false, limit };
    return { ok: true };
  }

  if (input.anonymousId) {
    const row = await prisma.searchUsage.upsert({
      where: { dayKey_anonymousId: { dayKey: key, anonymousId: input.anonymousId } },
      create: { dayKey: key, anonymousId: input.anonymousId, searches: 1 },
      update: { searches: { increment: 1 } },
      select: { searches: true },
    });
    if (row.searches > limit) return { ok: false, limit };
    return { ok: true };
  }

  // No identity: treat as blocked (shouldn't happen if middleware cookie exists).
  return { ok: false, limit };
}

