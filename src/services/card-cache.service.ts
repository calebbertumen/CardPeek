import type { Card, CardCache, CardCacheListing, ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCardCachePolicy, cachePolicyTtlMs } from "@/lib/cache/card-cache-policy";
import { getCardSearchStats, recordCardSearchEvent } from "@/services/card-search-activity.service";
import { buildCacheKey, normalizeCardKeyParts } from "@/lib/normalize";
import { fetchPokemonCardBestMatch } from "@/services/pokemon-tcg/pokemon-tcg.service";
import { getSoldCompsProvider } from "@/services/sold-comps";
import type { SoldCompListingDTO } from "@/services/sold-comps/types";
import { Prisma } from "@prisma/client";
import { computeDisplayedAveragePrice } from "@/lib/pricing/compute-displayed-average-price";

export type CardSearchResult = {
  card: Pick<Card, "name" | "setName" | "cardNumber" | "imageLarge" | "imageSmall" | "normalizedCardKey">;
  conditionBucket: ConditionBucket;
  avgPrice: number;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  listingsCount: number;
  lastUpdated: Date;
  /** When true, the viewer is seeing cached data while a refresh is queued/processing. */
  isRefreshing?: boolean;
  listings: Array<{
    title: string;
    source?: string;
    soldPrice: number;
    soldDate: Date;
    listingUrl: string;
    imageUrl: string | null;
    conditionLabel: string | null;
    gradeLabel?: string | null;
    rawOrGraded?: string | null;
    position: number;
  }>;
};

function computeStats(prices: number[]): {
  avg: number;
  median: number;
  low: number;
  high: number;
} {
  const valid = prices.filter((p) => Number.isFinite(p) && p > 0);
  if (valid.length === 0) {
    return { avg: 0, median: 0, low: 0, high: 0 };
  }
  const sorted = [...valid].sort((a, b) => a - b);
  const low = sorted[0]!;
  const high = sorted[sorted.length - 1]!;
  const avgResult = computeDisplayedAveragePrice(valid);
  const avg = avgResult.displayedAveragePrice ?? 0;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  return {
    avg: Math.round(avg * 100) / 100,
    median: Math.round(median * 100) / 100,
    low: Math.round(low * 100) / 100,
    high: Math.round(high * 100) / 100,
  };
}

function mapCacheToResult(
  card: Card,
  bucket: ConditionBucket,
  cache: CardCache,
  listings: CardCacheListing[],
): CardSearchResult {
  return {
    card: {
      name: card.name,
      setName: card.setName,
      cardNumber: card.cardNumber,
      imageLarge: card.imageLarge,
      imageSmall: card.imageSmall,
      normalizedCardKey: card.normalizedCardKey,
    },
    conditionBucket: bucket,
    avgPrice: Number(cache.avgPrice),
    medianPrice: Number(cache.medianPrice),
    lowPrice: Number(cache.lowPrice),
    highPrice: Number(cache.highPrice),
    listingsCount: cache.listingsCount,
    lastUpdated: cache.lastScrapedAt,
    listings: listings
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        title: l.title,
        source: l.source,
        soldPrice: Number(l.soldPrice),
        soldDate: l.soldDate,
        listingUrl: "",
        imageUrl: l.imageUrl,
        conditionLabel: l.conditionLabel,
        gradeLabel: l.gradeLabel,
        rawOrGraded: l.rawOrGraded,
        position: l.position,
      })),
  };
}

export async function upsertCardFromApi(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
}): Promise<Card> {
  const dto = await fetchPokemonCardBestMatch(input);
  if (!dto) {
    throw new Error("CARD_NOT_FOUND");
  }

  const normalizedCardKey = normalizeCardKeyParts({
    name: dto.name,
    setName: dto.set?.name ?? input.setName,
    cardNumber: dto.number ?? input.cardNumber,
  });

  return prisma.card.upsert({
    where: { pokemonTcgApiId: dto.id },
    create: {
      pokemonTcgApiId: dto.id,
      name: dto.name,
      setName: dto.set?.name ?? input.setName ?? null,
      cardNumber: dto.number ?? input.cardNumber ?? null,
      imageSmall: dto.images.small,
      imageLarge: dto.images.large,
      normalizedCardKey,
    },
    update: {
      name: dto.name,
      setName: dto.set?.name ?? input.setName ?? null,
      cardNumber: dto.number ?? input.cardNumber ?? null,
      imageSmall: dto.images.small,
      imageLarge: dto.images.large,
      normalizedCardKey,
    },
  });
}

/**
 * When the search form normalizes to the same key as a stored `Card`, skip the Pokémon TCG API round trip.
 * First-time or ambiguous queries still call {@link upsertCardFromApi}.
 */
export async function findOrUpsertCardForSearch(input: {
  normalizedKey: string;
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
}): Promise<Card> {
  const existing = await prisma.card.findUnique({
    where: { normalizedCardKey: input.normalizedKey },
  });
  if (existing) return existing;
  return upsertCardFromApi({
    name: input.name,
    setName: input.setName ?? null,
    cardNumber: input.cardNumber ?? null,
  });
}

export function listingsFromDtos(rows: SoldCompListingDTO[], takeCount: number): {
  stats: ReturnType<typeof computeStats>;
  listingsCount: number;
  listingCreates: Array<{
    title: string;
    source?: string;
    soldPrice: Prisma.Decimal;
    soldDate: Date;
    listingUrl: string;
    imageUrl?: string | null;
    conditionLabel: string | null;
    gradeLabel?: string | null;
    rawOrGraded?: string | null;
    position: number;
  }>;
} {
  // MVP rule: cache calculations must be based on a fixed-size snapshot.
  const take = rows.slice(0, Math.max(0, takeCount));
  const prices = take.map((r) => r.soldPrice);
  const stats = computeStats(prices);
  return {
    stats,
    listingsCount: take.length,
    listingCreates: take.map((r, i) => ({
      title: r.title,
      source: r.source,
      soldPrice: new Prisma.Decimal(r.soldPrice.toFixed(2)),
      soldDate: r.soldDate,
      listingUrl: "",
      imageUrl: r.imageUrl ?? null,
      conditionLabel: r.conditionLabel ?? null,
      gradeLabel: r.gradeLabel ?? null,
      rawOrGraded: r.rawOrGraded ?? null,
      position: i + 1,
    })),
  };
}

export async function writeCardCacheFromListings(input: {
  cardId: string;
  normalizedCardKey: string;
  conditionBucket: ConditionBucket;
  listings: SoldCompListingDTO[];
  takeCount: number;
  scrapedAt?: Date;
}): Promise<{ cache: CardCache; listings: CardCacheListing[] }> {
  const cacheKey = buildCacheKey(input.normalizedCardKey, input.conditionBucket);
  const scrapedAt = input.scrapedAt ?? new Date();
  const { stats, listingsCount, listingCreates } = listingsFromDtos(input.listings, input.takeCount);

  const cache = await prisma.$transaction(async (tx) => {
    const c = await tx.cardCache.upsert({
      where: { cacheKey },
      create: {
        cardId: input.cardId,
        conditionBucket: input.conditionBucket,
        cacheKey,
        avgPrice: new Prisma.Decimal(stats.avg.toFixed(2)),
        medianPrice: new Prisma.Decimal(stats.median.toFixed(2)),
        lowPrice: new Prisma.Decimal(stats.low.toFixed(2)),
        highPrice: new Prisma.Decimal(stats.high.toFixed(2)),
        listingsCount,
        lastScrapedAt: scrapedAt,
        lastReturnedAt: null,
      },
      update: {
        avgPrice: new Prisma.Decimal(stats.avg.toFixed(2)),
        medianPrice: new Prisma.Decimal(stats.median.toFixed(2)),
        lowPrice: new Prisma.Decimal(stats.low.toFixed(2)),
        highPrice: new Prisma.Decimal(stats.high.toFixed(2)),
        listingsCount,
        lastScrapedAt: scrapedAt,
      },
    });

    await tx.cardCacheListing.deleteMany({ where: { cardCacheId: c.id } });
    if (listingCreates.length > 0) {
      await tx.cardCacheListing.createMany({
        data: listingCreates.map((l) => ({
          ...l,
          cardCacheId: c.id,
          source: (l.source ?? "unknown") as string,
          gradeLabel: l.gradeLabel ?? null,
          rawOrGraded: l.rawOrGraded ?? null,
        })),
      });
    }

    return tx.cardCache.findUniqueOrThrow({
      where: { id: c.id },
      include: { listings: true },
    });
  });

  return { cache, listings: cache.listings };
}

export async function resolveCardSearch(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  conditionBucket: ConditionBucket;
}): Promise<CardSearchResult> {
  const card = await upsertCardFromApi(input);
  const statsPre = await getCardSearchStats(card.normalizedCardKey);
  const policy = getCardCachePolicy(statsPre);
  const ttlMs = cachePolicyTtlMs(policy);
  await recordCardSearchEvent(card.normalizedCardKey, null);

  const cacheKey = buildCacheKey(card.normalizedCardKey, input.conditionBucket);

  const existing = await prisma.cardCache.findUnique({
    where: { cacheKey },
    include: { listings: true },
  });

  const now = Date.now();
  if (existing && now - existing.lastScrapedAt.getTime() < ttlMs) {
    return mapCacheToResult(card, input.conditionBucket, existing, existing.listings);
  }

  // Legacy behavior (synchronous scrape) — kept for development fallback.
  // In MVP tiered gating, paid users should queue refreshes async and Starter users should never scrape.
  const provider = getSoldCompsProvider();
  const dtos = await provider.fetchRecentSold({
    cardName: card.name,
    setName: card.setName,
    cardNumber: card.cardNumber,
    conditionBucket: input.conditionBucket,
    cacheKey,
  });

  const { cache, listings } = await writeCardCacheFromListings({
    cardId: card.id,
    normalizedCardKey: card.normalizedCardKey,
    conditionBucket: input.conditionBucket,
    listings: dtos,
    takeCount: 5,
  });

  return mapCacheToResult(card, input.conditionBucket, cache, listings);
}
