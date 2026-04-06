import { prisma } from "@/lib/db";
import { getStarterHiddenLiveFetchesPerDay } from "@/lib/billing/product-config";

function dayKeyUtc(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Atomically increments usage if below the daily cap. Returns whether this request consumed a slot.
 */
export async function tryConsumeStarterHiddenLiveFetch(userId: string): Promise<boolean> {
  const limit = getStarterHiddenLiveFetchesPerDay();
  if (limit <= 0) return false;

  const dayKey = dayKeyUtc();

  return prisma.$transaction(async (tx) => {
    const row = await tx.starterHiddenLiveUsage.findUnique({
      where: { userId_dayKey: { userId, dayKey } },
    });
    const current = row?.fetches ?? 0;
    if (current >= limit) return false;

    await tx.starterHiddenLiveUsage.upsert({
      where: { userId_dayKey: { userId, dayKey } },
      create: { userId, dayKey, fetches: 1 },
      update: { fetches: current + 1 },
    });
    return true;
  });
}

/** If catalog lookup fails after a slot was reserved, put the allowance back. */
export async function refundStarterHiddenLiveFetch(userId: string): Promise<void> {
  const dayKey = dayKeyUtc();
  const row = await prisma.starterHiddenLiveUsage.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
  });
  if (!row || row.fetches <= 0) return;
  await prisma.starterHiddenLiveUsage.update({
    where: { userId_dayKey: { userId, dayKey } },
    data: { fetches: { decrement: 1 } },
  });
}
