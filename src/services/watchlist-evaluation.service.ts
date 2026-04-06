import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { notifyUser } from "@/services/notifications/notify";
import { totalListingCost } from "@/lib/pricing/total-cost";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { intervalMsForUserPlan } from "@/lib/scrape/config";

function stableListingKey(itemId: string | null, listingUrl: string): string {
  if (itemId && itemId.trim()) return itemId.trim();
  return `url:${listingUrl}`;
}

/**
 * Compare active snapshot rows to watchlist targets; dedupe via WatchlistAlertHistory.
 */
export async function evaluateWatchlistForActiveSnapshot(input: {
  cardVariantId: string;
  /** When set (scheduler), only these watchlist rows participate. */
  onlyWatchlistItemIds?: string[] | null;
  now?: Date;
}): Promise<{ alertsCreated: number }> {
  const now = input.now ?? new Date();

  const snapshot = await prisma.activeListingSnapshot.findUnique({
    where: { cardVariantId: input.cardVariantId },
    include: {
      listings: { orderBy: { position: "asc" } },
    },
  });

  if (!snapshot || snapshot.listings.length === 0) return { alertsCreated: 0 };

  const watchItemsRaw = await prisma.watchlistItem.findMany({
    where: {
      cardVariantId: input.cardVariantId,
      alertEnabled: true,
      targetPrice: { not: null },
      ...(input.onlyWatchlistItemIds?.length
        ? { id: { in: input.onlyWatchlistItemIds } }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      targetPrice: true,
    },
  });

  const uniqueUserIds = Array.from(new Set(watchItemsRaw.map((w) => w.userId)));
  const collectorUserIds = new Set(
    uniqueUserIds.length === 0
      ? []
      : (
          await prisma.subscription.findMany({
            where: {
              userId: { in: uniqueUserIds },
              status: "active",
              planId: "collector",
            },
            select: { userId: true },
          })
        ).map((s) => s.userId),
  );
  const watchItems = watchItemsRaw.filter((w) => collectorUserIds.has(w.userId));

  let alertsCreated = 0;

  for (const w of watchItems) {
    const target = Number(w.targetPrice);
    if (!Number.isFinite(target)) continue;

    for (const row of snapshot.listings) {
      const price = Number(row.price);
      const ship = row.shippingPrice === null ? null : Number(row.shippingPrice);
      const total = totalListingCost(price, ship);
      if (total > target) continue;

      const listingKey = stableListingKey(row.itemId, row.listingUrl);

      const created = await prisma.watchlistAlertHistory.createMany({
        data: [
          {
            userId: w.userId,
            watchlistItemId: w.id,
            cardVariantId: input.cardVariantId,
            listingItemId: listingKey,
            totalPriceSeen: new Prisma.Decimal(total.toFixed(2)),
          },
        ],
        skipDuplicates: true,
      });

      if (created.count === 0) continue;

      alertsCreated += created.count;

      await notifyUser({
        userId: w.userId,
        type: "watchlist_listing_alert",
        payload: {
          watchlistItemId: w.id,
          cardVariantId: input.cardVariantId,
          listingItemId: listingKey,
          totalPrice: total,
          targetPrice: target,
          listingUrl: row.listingUrl,
          title: row.title,
          alertedAt: now.toISOString(),
          note: "Active listing at or below your target (price + shipping when available).",
        },
      });
    }
  }

  return { alertsCreated };
}

export async function bumpWatchlistSchedulesForDueItems(input: {
  watchlistItemIds: string[];
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();

  for (const id of input.watchlistItemIds) {
    const row = await prisma.watchlistItem.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!row) continue;
    const plan = await getUserPlanId(row.userId);
    const ms = intervalMsForUserPlan(plan);
    await prisma.watchlistItem.update({
      where: { id },
      data: {
        lastActiveCheckAt: now,
        nextActiveCheckAfter: new Date(now.getTime() + ms),
      },
    });
  }
}
