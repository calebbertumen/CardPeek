import { prisma } from "@/lib/db";
import { deleteExpiredScrapeLocks } from "@/lib/scrape/scrape-lock";
import {
  getWatchlistMaxVariantsPerCycle,
} from "@/lib/scrape/config";
import { fetchAndPersistActiveListingsForVariant } from "@/services/active-listing.service";
import {
  bumpWatchlistSchedulesForDueItems,
  evaluateWatchlistForActiveSnapshot,
} from "@/services/watchlist-evaluation.service";
import { ensureCardVariantsForDueWatchlist } from "@/services/watchlist-variant-backfill.service";

/**
 * Scheduled watchlist active checks only — never triggered by HTTP search.
 * Scrapes once per distinct CardVariant with due watchers (shared across users).
 */
export async function runWatchlistActiveScrapeCycle(input?: {
  maxVariants?: number;
}): Promise<{
  variantsProcessed: number;
  variantsSkippedLocked: number;
  expiredLocksCleared: number;
}> {
  const expiredLocksCleared = await deleteExpiredScrapeLocks();
  await ensureCardVariantsForDueWatchlist();

  const limit = Math.min(
    input?.maxVariants ?? getWatchlistMaxVariantsPerCycle(),
    getWatchlistMaxVariantsPerCycle(),
  );

  const now = new Date();

  const collectorRows = await prisma.subscription.findMany({
    where: { status: "active", planId: "collector" },
    select: { userId: true },
  });
  const collectorUserIds = collectorRows.map((r) => r.userId);
  if (collectorUserIds.length === 0) {
    return { variantsProcessed: 0, variantsSkippedLocked: 0, expiredLocksCleared };
  }

  const due = await prisma.watchlistItem.findMany({
    where: {
      userId: { in: collectorUserIds },
      cardVariantId: { not: null },
      alertEnabled: true,
      targetPrice: { not: null },
      OR: [{ nextActiveCheckAfter: null }, { nextActiveCheckAfter: { lte: now } }],
    },
    select: { id: true, userId: true, cardVariantId: true },
  });

  const variantToDueIds = new Map<string, string[]>();
  const variantRank = new Map<string, number>();

  for (const row of due) {
    if (!row.cardVariantId) continue;
    const list = variantToDueIds.get(row.cardVariantId) ?? [];
    list.push(row.id);
    variantToDueIds.set(row.cardVariantId, list);

    const rank = 0;
    const prev = variantRank.get(row.cardVariantId) ?? 99;
    variantRank.set(row.cardVariantId, Math.min(prev, rank));
  }

  const variants = Array.from(variantToDueIds.keys()).sort(
    (a, b) => (variantRank.get(a) ?? 99) - (variantRank.get(b) ?? 99),
  );

  let variantsProcessed = 0;
  let variantsSkippedLocked = 0;

  for (const cardVariantId of variants.slice(0, limit)) {
    const dueIds = variantToDueIds.get(cardVariantId) ?? [];
    const res = await fetchAndPersistActiveListingsForVariant({ cardVariantId });
    if (!res.ok) {
      if (res.error === "locked") variantsSkippedLocked += 1;
      continue;
    }

    await evaluateWatchlistForActiveSnapshot({
      cardVariantId,
      onlyWatchlistItemIds: dueIds,
      now,
    });
    await bumpWatchlistSchedulesForDueItems({ watchlistItemIds: dueIds, now });
    variantsProcessed += 1;
  }

  return { variantsProcessed, variantsSkippedLocked, expiredLocksCleared };
}
