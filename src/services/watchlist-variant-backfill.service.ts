import { prisma } from "@/lib/db";
import { ensureCardVariantForCard } from "@/services/card-normalization.service";

/**
 * Links watchlist rows to CardVariant so scheduled scrapes are keyed by canonical identity.
 */
export async function ensureCardVariantsForDueWatchlist(): Promise<void> {
  const collectorIds = (
    await prisma.subscription.findMany({
      where: { status: "active", planId: "collector" },
      select: { userId: true },
    })
  ).map((s) => s.userId);
  if (collectorIds.length === 0) return;

  const items = await prisma.watchlistItem.findMany({
    where: {
      userId: { in: collectorIds },
      cardVariantId: null,
      alertEnabled: true,
      targetPrice: { not: null },
    },
    include: {
      card: {
        select: {
          id: true,
          name: true,
          setName: true,
          cardNumber: true,
          normalizedCardKey: true,
        },
      },
    },
  });

  for (const it of items) {
    const v = await ensureCardVariantForCard({
      card: it.card,
      conditionBucket: it.conditionBucket,
    });
    await prisma.watchlistItem.update({
      where: { id: it.id },
      data: { cardVariantId: v.id },
    });
  }
}
