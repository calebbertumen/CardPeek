import { prisma } from "@/lib/db";
import type { AccessTier } from "@/lib/billing/access";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { getTierEntitlements } from "@/lib/billing/entitlements";
import { searchCardMarketData } from "@/services/market-search.service";
import type { CollectionCondition, ConditionBucket } from "@prisma/client";

export class CollectionError extends Error {
  code: "FREE_LIMIT_REACHED";
  constructor(code: CollectionError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export type CollectionCardInput = {
  /** Normalized identifier used in-app (`Card.normalizedCardKey`). */
  cardId: string;
  cardName: string;
  imageUrl: string;
  setName?: string | null;
  cardNumber?: string | null;
};

const FREE_COLLECTION_LIMIT = 10;

export function mapCollectionConditionToBucket(condition: CollectionCondition): ConditionBucket {
  switch (condition) {
    case "NM":
      return "raw_nm";
    case "LP":
      return "raw_lp";
    case "MP":
    case "HP":
    case "DMG":
      return "raw_mp_hp";
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}

export async function enforceFreeLimit(userId: string): Promise<void> {
  const tier: AccessTier = await getUserPlanId(userId);
  if (tier === "collector") return;
  const count = await prisma.collectionItem.count({ where: { userId } });
  if (count >= FREE_COLLECTION_LIMIT) {
    throw new CollectionError(
      "FREE_LIMIT_REACHED",
      "You’ve reached your 10-card limit. Upgrade to Collector for unlimited tracking.",
    );
  }
}

export async function addToCollection(
  userId: string,
  cardData: CollectionCardInput,
  condition: CollectionCondition,
) {
  await enforceFreeLimit(userId);

  return prisma.collectionItem.create({
    data: {
      userId,
      cardId: cardData.cardId,
      cardName: cardData.cardName,
      imageUrl: cardData.imageUrl,
      setName: cardData.setName ?? null,
      cardNumber: cardData.cardNumber ?? null,
      condition,
    },
  });
}

export async function getUserCollection(userId: string) {
  return prisma.collectionItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** One thumbnail per (cardId + condition), newest row as representative; capped for dashboard preview. */
export async function getCollectionPreviewGroups(userId: string, maxGroups: number) {
  const rows = await prisma.collectionItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  type Row = (typeof rows)[number];
  const groups: { item: Row; quantity: number }[] = [];
  const keyToIndex = new Map<string, number>();

  for (const it of rows) {
    const k = `${it.cardId}__${it.condition}`;
    const idx = keyToIndex.get(k);
    if (idx === undefined) {
      keyToIndex.set(k, groups.length);
      groups.push({ item: it, quantity: 1 });
    } else {
      groups[idx]!.quantity += 1;
    }
  }

  return groups.slice(0, Math.max(0, maxGroups));
}

export async function getCollectionCount(userId: string) {
  return prisma.collectionItem.count({ where: { userId } });
}

export async function removeFromCollection(input: { userId: string; collectionItemId: string }) {
  // Scoped delete: prevents removing other users' items.
  await prisma.collectionItem.deleteMany({
    where: { id: input.collectionItemId, userId: input.userId },
  });
}

export async function removeManyFromCollectionByCard(input: {
  userId: string;
  cardId: string;
  condition: CollectionCondition;
  count: number;
}): Promise<{ removed: number }> {
  const take = Math.max(0, Math.min(50, Math.floor(input.count)));
  if (take <= 0) return { removed: 0 };

  const rows = await prisma.collectionItem.findMany({
    where: { userId: input.userId, cardId: input.cardId, condition: input.condition },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true },
  });
  if (rows.length === 0) return { removed: 0 };

  const del = await prisma.collectionItem.deleteMany({
    where: { userId: input.userId, id: { in: rows.map((r) => r.id) } },
  });
  return { removed: del.count };
}

export type CollectionItemPricing = {
  price: number | null;
  lastUpdated: Date | null;
  isStale: boolean;
  isRefreshing: boolean;
};

/**
 * Reuses the existing pricing/cache pipeline.
 * - Collector: normal behavior (may queue refresh/scrape)
 * - Starter (Free): never queues lifetime fresh scrapes from collection
 *   - uses cached values if present (even if stale)
 *   - returns null when no cache exists
 */
export async function getPricingForCollectionItem(input: {
  userId: string;
  tier: AccessTier;
  item: {
    cardName: string;
    setName: string | null;
    cardNumber: string | null;
    condition: CollectionCondition;
  };
}): Promise<CollectionItemPricing> {
  const entitlements = getTierEntitlements(input.tier);
  const conditionBucket = mapCollectionConditionToBucket(input.item.condition);

  const result = await searchCardMarketData({
    name: input.item.cardName,
    setName: input.item.setName,
    cardNumber: input.item.cardNumber,
    requestedConditionBucket: conditionBucket,
    entitlements,
    userId: input.userId,
    allowStarterFreshScrape: input.tier === "starter" ? false : true,
  });

  if (result.kind === "ok") {
    return {
      price: result.data.avgPrice,
      lastUpdated: result.data.lastUpdated,
      isStale: result.data.isStale,
      isRefreshing: result.data.isRefreshing,
    };
  }

  // No cache: Free should not trigger scrapes, so show null until the user searches.
  return {
    price: null,
    lastUpdated: null,
    isStale: true,
    isRefreshing: result.isRefreshing,
  };
}

