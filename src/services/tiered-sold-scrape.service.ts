import type { ConditionBucket } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { buildSoldBroadRawCacheKey, buildSoldConditionFallbackRawCacheKey } from "@/lib/normalize";
import {
  buildBroadRawEbaySoldSearchKeyword,
  buildConditionFallbackEbaySoldSearchKeyword,
  buildRawMpHpFallbackEbaySearchKeywords,
} from "@/lib/search/sold-search-query";
import { mergeDedupeSoldListings } from "@/lib/search/merge-sold-listings";
import { soldListingTitleMatchesBucket } from "@/lib/search/ebay-sold-filters";
import { getCardSearchStats } from "@/services/card-search-activity.service";
import { getCardCachePolicy, cachePolicyTtlMs } from "@/lib/cache/card-cache-policy";
import { isSoldCacheFresh } from "@/lib/sold-cache/cache-fresh";
import { prisma } from "@/lib/db";
import { scrapeCardMarketData } from "@/services/scraper/scraper";
import type { ScrapedCardSnapshot, ScrapedSoldListing } from "@/lib/scraping/types";
import { buildScrapedCardSnapshotFromSoldListings } from "@/lib/pricing/sold-comp-selection";

/** `CardCache.conditionBucket` for the shared broad raw row (semantic condition lives in `cacheKey` only). */
const BROAD_RAW_CACHE_CONDITION_PLACEHOLDER = "raw_nm" as const;

function storeRawPayload(): boolean {
  return process.env.SCRAPING_STORE_RAW_PAYLOAD === "true";
}

const USABLE_COMPS_BEFORE_FALLBACK = 3;

function mergeBucketMatchesSorted(
  broadMatches: ScrapedSoldListing[],
  narrowPool: ScrapedSoldListing[],
  conditionBucket: ConditionBucket,
): ScrapedSoldListing[] {
  return mergeDedupeSoldListings(broadMatches, narrowPool, 200)
    .filter((l) => soldListingTitleMatchesBucket(l.title, conditionBucket, l.conditionLabel ?? null))
    .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());
}

async function loadScrapedListingsFromCardCacheRow(cardCacheId: string): Promise<ScrapedSoldListing[]> {
  const rows = await prisma.cardCacheListing.findMany({
    where: { cardCacheId },
    orderBy: { position: "asc" },
    select: {
      title: true,
      soldPrice: true,
      soldDate: true,
      itemId: true,
      imageUrl: true,
      conditionLabel: true,
    },
  });
  return rows.map((r) => ({
    title: r.title,
    soldPrice: Number(r.soldPrice),
    soldAt: r.soldDate,
    itemId: r.itemId,
    itemUrl: null,
    imageUrl: r.imageUrl,
    conditionLabel: r.conditionLabel,
  }));
}

async function upsertSoldCardCacheTx(
  tx: Prisma.TransactionClient,
  input: {
    cardId: string;
    cardVariantId?: string | null;
    cacheKey: string;
    conditionBucket: ConditionBucket;
    ebaySearchKeyword: string | null;
    listings: ScrapedSoldListing[];
    scrapedAt: Date;
  },
): Promise<void> {
  const listings = input.listings;
  const n = listings.length;
  const priorRow = await tx.cardCache.findUnique({
    where: { cacheKey: input.cacheKey },
    select: { avgPrice: true },
  });

  let avgPrice = 0;
  let medianPrice = 0;
  let minPrice = 0;
  let maxPrice = 0;
  if (n > 0) {
    const prices = listings.map((l) => l.soldPrice);
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianPrice = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
    avgPrice = medianPrice;
  }

  const c = await tx.cardCache.upsert({
    where: { cacheKey: input.cacheKey },
    create: {
      cardId: input.cardId,
      cardVariantId: input.cardVariantId ?? null,
      conditionBucket: input.conditionBucket,
      cacheKey: input.cacheKey,
      ebaySearchKeyword: input.ebaySearchKeyword,
      avgPrice: new Prisma.Decimal(avgPrice.toFixed(2)),
      medianPrice: new Prisma.Decimal(medianPrice.toFixed(2)),
      lowPrice: new Prisma.Decimal(minPrice.toFixed(2)),
      highPrice: new Prisma.Decimal(maxPrice.toFixed(2)),
      priorScrapeAvgPrice: null,
      listingsCount: n,
      lastScrapedAt: input.scrapedAt,
      lastReturnedAt: null,
      lastScrapeError: null,
    },
    update: {
      cardVariantId: input.cardVariantId ?? null,
      ebaySearchKeyword: input.ebaySearchKeyword,
      priorScrapeAvgPrice: priorRow?.avgPrice ?? null,
      avgPrice: new Prisma.Decimal(avgPrice.toFixed(2)),
      medianPrice: new Prisma.Decimal(medianPrice.toFixed(2)),
      lowPrice: new Prisma.Decimal(minPrice.toFixed(2)),
      highPrice: new Prisma.Decimal(maxPrice.toFixed(2)),
      listingsCount: n,
      lastScrapedAt: input.scrapedAt,
      lastScrapeError: null,
    },
  });

  await tx.cardCacheListing.deleteMany({ where: { cardCacheId: c.id } });
  if (listings.length > 0) {
    await tx.cardCacheListing.createMany({
      data: listings.map((l, i) => ({
        cardCacheId: c.id,
        title: l.title,
        source: "ebay",
        soldPrice: new Prisma.Decimal(l.soldPrice.toFixed(2)),
        soldDate: l.soldAt,
        listingUrl: "",
        itemId: l.itemId ?? null,
        imageUrl: l.imageUrl ?? null,
        rawPayload: storeRawPayload() ? ((l.raw ?? null) as Prisma.InputJsonValue) : undefined,
        conditionLabel: l.conditionLabel ?? null,
        gradeLabel: null,
        rawOrGraded: null,
        position: i + 1,
      })),
    });
  }
}

/**
 * Tiered raw-lane sold scrape: shared broad snapshot (no condition tokens), then optional condition-specific
 * fallback Apify runs when the selected bucket has fewer than {@link USABLE_COMPS_BEFORE_FALLBACK} usable comps.
 * Fallback is Collector-only; results are still reclassified with {@link soldListingTitleMatchesBucket}.
 * Per-query fallback rows are cached under {@link buildSoldConditionFallbackRawCacheKey}; merged comps are written
 * to `mergedCacheKey` by the scrape worker.
 */
export async function scrapeTieredRawSoldSnapshot(input: {
  card: {
    id: string;
    name: string;
    setName: string | null;
    cardNumber: string | null;
    normalizedCardKey: string;
  };
  conditionBucket: ConditionBucket;
  mergedCacheKey: string;
  requestedByUserId: string | null;
}): Promise<{ merged: ScrapedCardSnapshot; ebaySearchKeyword: string }> {
  const { card, conditionBucket, requestedByUserId } = input;
  const broadCacheKey = buildSoldBroadRawCacheKey(card.normalizedCardKey);
  const stats = await getCardSearchStats(card.normalizedCardKey);
  const ttlMs = cachePolicyTtlMs(getCardCachePolicy(stats));
  const now = Date.now();

  let collector = false;
  if (requestedByUserId) {
    const u = await prisma.user.findUnique({
      where: { id: requestedByUserId },
      select: { collectorTierActive: true },
    });
    collector = Boolean(u?.collectorTierActive);
  }

  const broadKeyword = buildBroadRawEbaySoldSearchKeyword({
    name: card.name,
    setName: card.setName,
    cardNumber: card.cardNumber,
  });

  const broadRow = await prisma.cardCache.findUnique({
    where: { cacheKey: broadCacheKey },
    select: { id: true, lastScrapedAt: true },
  });

  let broadListings: ScrapedSoldListing[] = [];
  const broadFresh = broadRow ? isSoldCacheFresh(broadRow.lastScrapedAt, now, ttlMs) : false;

  if (broadFresh && broadRow) {
    broadListings = await loadScrapedListingsFromCardCacheRow(broadRow.id);
  } else {
    const broadScraped = await scrapeCardMarketData({
      normalizedCardIdentifier: card.normalizedCardKey,
      queryText: broadKeyword,
      conditionBucket,
      cacheKey: broadCacheKey,
      listingMappingMode: "broad_raw_lane",
    });
    broadListings = broadScraped.soldListings;
    await prisma.$transaction(async (tx) => {
      await upsertSoldCardCacheTx(tx, {
        cardId: card.id,
        cardVariantId: null,
        cacheKey: broadCacheKey,
        conditionBucket: BROAD_RAW_CACHE_CONDITION_PLACEHOLDER,
        ebaySearchKeyword: broadKeyword,
        listings: broadListings,
        scrapedAt: broadScraped.scrapedAt,
      });
    });
  }

  const bucketMatches = broadListings.filter((l) =>
    soldListingTitleMatchesBucket(l.title, conditionBucket, l.conditionLabel ?? null),
  );

  const displayEbayKeyword = broadKeyword;
  let mergedListings = mergeBucketMatchesSorted(bucketMatches, [], conditionBucket);

  if (bucketMatches.length < USABLE_COMPS_BEFORE_FALLBACK && collector) {
    const loadFreshFallbackListingsOrMiss = async (fallbackCacheKey: string): Promise<ScrapedSoldListing[] | "miss"> => {
      const row = await prisma.cardCache.findUnique({
        where: { cacheKey: fallbackCacheKey },
        select: { id: true, lastScrapedAt: true },
      });
      if (!row || !isSoldCacheFresh(row.lastScrapedAt, now, ttlMs)) return "miss";
      return loadScrapedListingsFromCardCacheRow(row.id);
    };

    let narrowAccum: ScrapedSoldListing[] = [];

    const runOneFallbackQuery = async (narrowKw: string, fallbackCacheKey: string): Promise<void> => {
      const cached = await loadFreshFallbackListingsOrMiss(fallbackCacheKey);
      let narrowListings: ScrapedSoldListing[];
      if (cached !== "miss") {
        narrowListings = cached;
      } else {
        const narrowScraped = await scrapeCardMarketData({
          normalizedCardIdentifier: card.normalizedCardKey,
          queryText: narrowKw,
          conditionBucket,
          cacheKey: fallbackCacheKey,
          listingMappingMode: "broad_raw_lane",
        });
        narrowListings = narrowScraped.soldListings;
        await prisma.$transaction(async (tx) => {
          await upsertSoldCardCacheTx(tx, {
            cardId: card.id,
            cardVariantId: null,
            cacheKey: fallbackCacheKey,
            conditionBucket,
            ebaySearchKeyword: narrowKw,
            listings: narrowListings,
            scrapedAt: narrowScraped.scrapedAt,
          });
        });
      }
      narrowAccum = mergeDedupeSoldListings(narrowAccum, narrowListings, 200);
    };

    if (conditionBucket === "raw_mp_hp") {
      const queries = buildRawMpHpFallbackEbaySearchKeywords({
        name: card.name,
        setName: card.setName,
        cardNumber: card.cardNumber,
      });
      for (let i = 0; i < queries.length; i += 1) {
        const narrowKw = queries[i]!;
        const fallbackKey = buildSoldConditionFallbackRawCacheKey(card.normalizedCardKey, conditionBucket, i);
        await runOneFallbackQuery(narrowKw, fallbackKey);
        mergedListings = mergeBucketMatchesSorted(bucketMatches, narrowAccum, conditionBucket);
        if (mergedListings.length >= USABLE_COMPS_BEFORE_FALLBACK) break;
      }
    } else {
      const narrowKw = buildConditionFallbackEbaySoldSearchKeyword({
        name: card.name,
        setName: card.setName,
        cardNumber: card.cardNumber,
        conditionBucket,
      });
      if (narrowKw) {
        const fallbackKey = buildSoldConditionFallbackRawCacheKey(card.normalizedCardKey, conditionBucket);
        await runOneFallbackQuery(narrowKw, fallbackKey);
        mergedListings = mergeBucketMatchesSorted(bucketMatches, narrowAccum, conditionBucket);
      }
    }
  }

  const merged = buildScrapedCardSnapshotFromSoldListings({
    normalizedCardIdentifier: card.normalizedCardKey,
    displayName: displayEbayKeyword,
    listings: mergedListings,
    context: {
      name: card.name,
      setName: card.setName,
      cardNumber: card.cardNumber,
      conditionBucket,
    },
  });
  return { merged, ebaySearchKeyword: displayEbayKeyword };
}
