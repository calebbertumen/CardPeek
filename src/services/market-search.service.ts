import type { ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildCacheKey, normalizeCardKeyParts } from "@/lib/normalize";
import type { Entitlements } from "@/lib/billing/entitlements";
import { findOrUpsertCardForSearch } from "@/services/card-cache.service";
import { fetchPokemonCardBestMatch } from "@/services/pokemon-tcg/pokemon-tcg.service";
import { queueScrapeRefreshIfNeeded } from "@/services/scrape-queue.service";
import { logSoldScrapeMetric } from "@/services/apify/scrape-metrics";
import { waitForFreshSoldCache } from "@/services/sold-cache-wait.service";
import { cleanupStaleSoldScrapeJobs, processPendingScrapeJobs } from "@/services/scrape-worker.service";
import {
  averageExcludesSomeListings,
  computeDisplayedAveragePrice,
} from "@/lib/pricing/compute-displayed-average-price";
import { buildMarketSnapshotInsights, type MarketSnapshotInsights } from "@/lib/pricing/market-snapshot-insights";
import {
  getFreshScrapeEntitlementForUser,
  queueStarterFreshScrapeIfAllowed,
} from "@/services/fresh-scrape-usage.service";
import { getCardCachePolicy, cachePolicyTtlMs } from "@/lib/cache/card-cache-policy";
import { logCachePolicyDecision } from "@/lib/cache/cache-policy-log";
import {
  getCardSearchStats,
  recordCardSearchEvent,
} from "@/services/card-search-activity.service";
import { resolveEbaySoldSearchKeywordForDisplay } from "@/lib/search/sold-search-query";
import {
  soldSampleStrengthFromUsableCount,
  type SoldSampleStrength,
} from "@/lib/pricing/sold-sample-strength";

export type MarketSearchResult =
  | {
      kind: "ok";
      data: {
        card: {
          id: string;
          name: string;
          setName: string | null;
          cardNumber: string | null;
          imageSmall: string;
          imageLarge: string;
          normalizedCardKey: string;
        };
        conditionBucket: ConditionBucket;
        avgPrice: number;
        avgExcludedPrices?: number[] | null;
        medianPrice: number;
        lowPrice: number;
        highPrice: number;
        listingsCount: number;
        usableCompCount: number;
        soldSampleStrength: SoldSampleStrength;
        limitedSampleNote?: string | null;
        lastUpdated: Date;
        isStale: boolean;
        /** True while cache is stale and a sold scrape is queued or in-flight (drives polling / worker kick). */
        isRefreshing: boolean;
        /** True only when this request created a new scrape job  -  show “Fetching…” UI (not for duplicate already-queued jobs). */
        showFetchingBanner: boolean;
        lastScrapeError?: string | null;
        ebaySearchKeyword: string | null;
        freeUpdatedLookups: null | { limit: number; used: number; remaining: number };
        snapshotInsights: MarketSnapshotInsights;
        listings: Array<{
          title: string;
          source: string;
          soldPrice: number;
          soldDate: Date;
          listingUrl: string;
          conditionLabel: string | null;
          gradeLabel: string | null;
          rawOrGraded: string | null;
          position: number;
        }>;
      };
    }
  | {
      kind: "no_data";
      card: {
        id: string;
        name: string;
        setName: string | null;
        cardNumber: string | null;
        imageSmall: string;
        imageLarge: string;
        normalizedCardKey: string;
      };
      conditionBucket: ConditionBucket;
      /** Background scrape queued or in-flight (poll until cache fills). */
      isRefreshing: boolean;
      /** Show prominent “Fetching…” only when this request created a new job. */
      showFetchingBanner: boolean;
      blockedReason?: "FREE_LIFETIME_SCRAPE_LIMIT";
      freeUpdatedLookups?: { limit: number; used: number; remaining: number };
    };

const COLLECTOR_QUEUE_PRIORITY = 1000;
const STARTER_QUEUE_PRIORITY = 200;
const LAST_RETURNED_AT_THROTTLE_MS = 6 * 60 * 60 * 1000;
/** Hide “market data is being updated” unless the snapshot is at least this old (avoids false positives on fresh cache). */
const MIN_CACHE_AGE_MS_FOR_REFRESH_UI = 24 * 60 * 60 * 1000;

export async function searchCardMarketData(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  requestedConditionBucket: ConditionBucket;
  entitlements: Entitlements;
  userId?: string | null;
  /**
   * When false, Starter users will not be allowed to queue (or consume) lifetime fresh scrapes.
   * This is used for passive views (e.g. collection) to prevent Free-tier scrape loopholes.
   */
  allowStarterFreshScrape?: boolean;
}): Promise<MarketSearchResult> {
  const conditionBucket = input.entitlements.canUseFilters
    ? input.requestedConditionBucket
    : ("raw_nm" as ConditionBucket);

  const normalizedKey = normalizeCardKeyParts({
    name: input.name,
    setName: input.setName ?? null,
    cardNumber: input.cardNumber ?? null,
  });

  const tier = input.entitlements.tier;
  const userId = input.userId ?? null;
  const allowStarterFreshScrape = input.allowStarterFreshScrape !== false;

  const card =
    tier !== "preview"
      ? await findOrUpsertCardForSearch({
          normalizedKey,
          name: input.name,
          setName: input.setName ?? null,
          cardNumber: input.cardNumber ?? null,
        })
      : await (async () => {
          /**
           * Logged-in searches store `Card.normalizedCardKey` from the TCG API match (canonical name/set/number).
           * Preview used to key only on raw form text, so keys often differed (e.g. missing #) and cache lookups failed.
           */
          const byRawKey = await prisma.card.findUnique({
            where: { normalizedCardKey: normalizedKey },
          });
          if (byRawKey) return byRawKey;

          const dto = await fetchPokemonCardBestMatch({
            name: input.name,
            setName: input.setName ?? null,
            cardNumber: input.cardNumber ?? null,
          });
          if (dto) {
            const keyFromApi = normalizeCardKeyParts({
              name: dto.name,
              setName: dto.set?.name ?? input.setName,
              cardNumber: dto.number ?? input.cardNumber,
            });
            const byApiKey = await prisma.card.findUnique({
              where: { normalizedCardKey: keyFromApi },
            });
            if (byApiKey) return byApiKey;
          }
          return prisma.card.findUnique({
            where: { normalizedCardKey: normalizedKey },
          });
        })();

  if (!card) {
    return {
      kind: "no_data",
      card: {
        id: "__unknown__",
        name: input.name,
        setName: input.setName ?? null,
        cardNumber: input.cardNumber ?? null,
        imageSmall: "",
        imageLarge: "",
        normalizedCardKey: normalizedKey,
      },
      conditionBucket,
      isRefreshing: false,
      showFetchingBanner: false,
    };
  }

  const cacheKey = buildCacheKey(card.normalizedCardKey, conditionBucket);
  const [statsPre, existingBase] = await Promise.all([
    getCardSearchStats(card.normalizedCardKey),
    prisma.cardCache.findUnique({
      where: { cacheKey },
      select: {
        id: true,
        avgPrice: true,
        medianPrice: true,
        lowPrice: true,
        highPrice: true,
        listingsCount: true,
        lastScrapedAt: true,
        lastReturnedAt: true,
        lastScrapeError: true,
        ebaySearchKeyword: true,
        priorScrapeAvgPrice: true,
      },
    }),
  ]);
  const policy = getCardCachePolicy(statsPre);
  const ttlMs = cachePolicyTtlMs(policy);

  // Non-blocking analytics: don't keep cache-hit latency hostage to a write.
  void Promise.resolve(recordCardSearchEvent(card.normalizedCardKey, userId)).catch(() => {
    // best-effort
  });

  let existing = existingBase;

  const now = Date.now();
  const cacheFreshForCleanup = existing ? now - existing.lastScrapedAt.getTime() < ttlMs : false;
  /** Stale-job cleanup can touch many rows; skip when this snapshot is already within TTL (no scrape path needed). */
  if (!cacheFreshForCleanup) {
    await cleanupStaleSoldScrapeJobs();
  }

  const isFresh = existing ? now - existing.lastScrapedAt.getTime() < ttlMs : false;
  const isStale = existing ? !isFresh : true;

  let collectorDidQueueNew = false;
  /** True when a sold scrape is queued or already pending for this cache key. */
  let scrapeRefreshPending = false;
  if (isStale && input.entitlements.canTriggerRefresh) {
    logSoldScrapeMetric({
      event: "apify_ebay_sold",
      outcome: "cache_miss",
      cacheKey,
      normalizedQuery: cacheKey,
    });
    const collectorQueueResult = await queueScrapeRefreshIfNeeded({
      cardId: card.id,
      conditionBucket,
      cacheKey,
      requestedByUserId: userId,
      priority: COLLECTOR_QUEUE_PRIORITY,
    });
    collectorDidQueueNew = collectorQueueResult.didQueue;
    scrapeRefreshPending = collectorQueueResult.didQueue || collectorQueueResult.alreadyQueued;
  }

  // Starter: allow up to 3 lifetime updated lookups (scrape runs) when cache is missing or stale.
  let starterDidQueueNew = false;
  let starterScrapePending = false;
  if (allowStarterFreshScrape && isStale && tier === "starter" && userId) {
    const entitlement = await getFreshScrapeEntitlementForUser({ tier, userId });
    if (entitlement.allowed) {
      const starterQueueResult = await queueStarterFreshScrapeIfAllowed({
        userId,
        cardId: card.id,
        conditionBucket,
        cacheKey,
        priority: STARTER_QUEUE_PRIORITY,
      });
      starterDidQueueNew = starterQueueResult.kind === "queued";
      starterScrapePending =
        starterQueueResult.kind === "queued" || starterQueueResult.kind === "already_queued";
    }
  }

  let backgroundRefreshPending = scrapeRefreshPending || starterScrapePending;

  /**
   * Collector: run at least one queued job when we still have cached pricing but TTL says stale.
   * Collection and other passive views never called `processPendingScrapeJobs`, so "Refreshing…" could stick indefinitely.
   */
  if (
    existing &&
    tier === "collector" &&
    input.entitlements.canTriggerRefresh &&
    isStale &&
    backgroundRefreshPending
  ) {
    await processPendingScrapeJobs({ limit: 1 });
    existing = await prisma.cardCache.findUnique({
      where: { cacheKey },
      select: {
        id: true,
        avgPrice: true,
        medianPrice: true,
        lowPrice: true,
        highPrice: true,
        listingsCount: true,
        lastScrapedAt: true,
        lastReturnedAt: true,
        lastScrapeError: true,
        ebaySearchKeyword: true,
        priorScrapeAvgPrice: true,
      },
    });
    if (existing) {
      const nowAfter = Date.now();
      const freshAfter = nowAfter - existing.lastScrapedAt.getTime() < ttlMs;
      if (freshAfter) {
        scrapeRefreshPending = false;
        starterScrapePending = false;
      } else {
        const still = await prisma.scrapeJob.findFirst({
          where: { cacheKey, kind: "sold", status: { in: ["pending", "running"] } },
          select: { id: true },
        });
        if (!still) {
          scrapeRefreshPending = false;
          starterScrapePending = false;
        }
      }
    }
    backgroundRefreshPending = scrapeRefreshPending || starterScrapePending;
  }

  const cacheStatus: "hit" | "stale" | "miss" = !existing ? "miss" : isFresh ? "hit" : "stale";
  logCachePolicyDecision({
    normalizedCardKey: card.normalizedCardKey,
    temperature: policy.temperature,
    ttlHours: policy.ttlHours,
    reasons: policy.reasons,
    cacheStatus,
    refreshTriggered: backgroundRefreshPending,
  });

  const showFetchingBannerNoCache = collectorDidQueueNew || starterDidQueueNew;

  if (!existing) {
    if (input.entitlements.canTriggerRefresh) {
      return {
        kind: "no_data",
        card: {
          id: card.id,
          name: card.name,
          setName: card.setName ?? null,
          cardNumber: card.cardNumber ?? null,
          imageSmall: card.imageSmall,
          imageLarge: card.imageLarge,
          normalizedCardKey: card.normalizedCardKey,
        },
        conditionBucket,
        isRefreshing: backgroundRefreshPending,
        showFetchingBanner: showFetchingBannerNoCache,
      };
    } else if (tier === "starter" && userId) {
      // Run the worker before re-checking entitlements: queueing a refresh reserves a credit, so
      // `remaining` can be 0 until the job consumes or refunds. Otherwise we'd return FREE_LIFETIME_SCRAPE_LIMIT
      // without ever running the worker  -  leaving `ScrapeJob` pending and `freeLifetimeUpdatedLookupsReserved` stuck.
      if (backgroundRefreshPending) {
        await processPendingScrapeJobs({ limit: 1 });
        await waitForFreshSoldCache({ cacheKey, ttlMs });
        existing = await prisma.cardCache.findUnique({
          where: { cacheKey },
          select: {
            id: true,
            avgPrice: true,
            medianPrice: true,
            lowPrice: true,
            highPrice: true,
            listingsCount: true,
            lastScrapedAt: true,
            lastReturnedAt: true,
            lastScrapeError: true,
            ebaySearchKeyword: true,
            priorScrapeAvgPrice: true,
          },
        });
      }

      const ent = await getFreshScrapeEntitlementForUser({ tier, userId });
      const counts =
        ent.limit != null && ent.used != null && ent.remaining != null
          ? { limit: ent.limit, used: ent.used, remaining: ent.remaining }
          : undefined;
      // After the last lifetime scrape succeeds, `used === limit` so `allowed` is false, but we already
      // have `existing` cache  -  still show results instead of FREE_LIFETIME_SCRAPE_LIMIT.
      if (!ent.allowed && !existing) {
        return {
          kind: "no_data",
          card: {
            id: card.id,
            name: card.name,
            setName: card.setName ?? null,
            cardNumber: card.cardNumber ?? null,
            imageSmall: card.imageSmall,
            imageLarge: card.imageLarge,
            normalizedCardKey: card.normalizedCardKey,
          },
          conditionBucket,
          isRefreshing: false,
          showFetchingBanner: false,
          blockedReason: "FREE_LIFETIME_SCRAPE_LIMIT",
          freeUpdatedLookups: counts,
        };
      }

      if (!existing) {
        return {
          kind: "no_data",
          card: {
            id: card.id,
            name: card.name,
            setName: card.setName ?? null,
            cardNumber: card.cardNumber ?? null,
            imageSmall: card.imageSmall,
            imageLarge: card.imageLarge,
            normalizedCardKey: card.normalizedCardKey,
          },
          conditionBucket,
          isRefreshing: backgroundRefreshPending,
          showFetchingBanner: showFetchingBannerNoCache,
        };
      }
    } else {
      return {
        kind: "no_data",
        card: {
          id: card.id,
          name: card.name,
          setName: card.setName ?? null,
          cardNumber: card.cardNumber ?? null,
          imageSmall: card.imageSmall,
          imageLarge: card.imageLarge,
          normalizedCardKey: card.normalizedCardKey,
        },
        conditionBucket,
        isRefreshing: false,
        showFetchingBanner: false,
      };
    }
  }

  // Throttle lastReturnedAt writes (best-effort, non-blocking).
  const lastReturnedAtMs = existing.lastReturnedAt?.getTime() ?? 0;
  if (lastReturnedAtMs === 0 || now - lastReturnedAtMs > LAST_RETURNED_AT_THROTTLE_MS) {
    void Promise.resolve(
      prisma.cardCache.update({
        where: { id: existing.id },
        data: { lastReturnedAt: new Date() },
      }),
    ).catch(() => {
      // best-effort
    });
  }

  const nowOk = Date.now();
  const cacheAgeMs = nowOk - existing.lastScrapedAt.getTime();
  const cacheIsFresh = cacheAgeMs < ttlMs;
  const isStaleFinal = !cacheIsFresh;
  const suppressUpdatingUi =
    Number.isFinite(cacheAgeMs) && cacheAgeMs >= 0 && cacheAgeMs < MIN_CACHE_AGE_MS_FOR_REFRESH_UI;
  // Only flag "refreshing" when *this* request queued a new scrape. `backgroundRefreshPending` can stay true for
  // jobs queued earlier, which would otherwise keep the UI spinner up while we already show cached results.
  const showFetchingBannerFinal =
    suppressUpdatingUi ? false : cacheIsFresh ? false : collectorDidQueueNew || starterDidQueueNew;
  const isRefreshingFinal = showFetchingBannerFinal;

  if (cacheIsFresh) {
    logSoldScrapeMetric({
      event: "apify_ebay_sold",
      outcome: "cache_hit",
      cacheKey,
      normalizedQuery: existing.ebaySearchKeyword ?? cacheKey,
    });
  }

  const listingTake = input.entitlements.recentSalesVisibleCount;
  const [listingRowsFull, starterCounts] = await Promise.all([
    listingTake > 0
      ? prisma.cardCacheListing.findMany({
          where: { cardCacheId: existing.id },
          orderBy: { position: "asc" },
          take: listingTake,
          select: {
            title: true,
            source: true,
            soldPrice: true,
            soldDate: true,
            conditionLabel: true,
            gradeLabel: true,
            rawOrGraded: true,
            position: true,
          },
        })
      : Promise.resolve([]),
    tier === "starter" && userId
      ? getFreshScrapeEntitlementForUser({ tier, userId })
      : Promise.resolve(null),
  ]);

  const freeUpdatedLookups =
    starterCounts && starterCounts.limit != null && starterCounts.used != null && starterCounts.remaining != null
      ? { limit: starterCounts.limit, used: starterCounts.used, remaining: starterCounts.remaining }
      : null;

  const listingPrices = listingRowsFull.map((l) => ({
    soldPrice: Number(l.soldPrice),
    position: l.position,
    soldDate: l.soldDate,
  }));

  const listings =
    listingTake > 0
      ? listingRowsFull.map((l) => ({
          title: l.title,
          source: l.source,
          soldPrice: Number(l.soldPrice),
          soldDate: l.soldDate,
          listingUrl: "",
          conditionLabel: l.conditionLabel,
          gradeLabel: l.gradeLabel,
          rawOrGraded: l.rawOrGraded,
          position: l.position,
        }))
      : [];

  const pricing = computeDisplayedAveragePrice(listingPrices.map((l) => l.soldPrice));
  const avgExcludedPrices =
    averageExcludesSomeListings(pricing.pricingMethod) && pricing.excludedPrices.length > 0
      ? pricing.excludedPrices
      : null;

  const snapshotInsights =
    listingPrices.length > 0
      ? buildMarketSnapshotInsights({
          listings: listingPrices.map((l) => ({
            soldPrice: Number(l.soldPrice),
            soldDate: l.soldDate,
            position: l.position,
          })),
          snapshotLow: Number(existing.lowPrice),
          snapshotHigh: Number(existing.highPrice),
          priorScrapeAvgPrice:
            existing.priorScrapeAvgPrice != null ? Number(existing.priorScrapeAvgPrice) : null,
        })
      : null;

  const usableCompCount = existing.listingsCount;
  const soldSampleStrength = soldSampleStrengthFromUsableCount(usableCompCount);
  const limitedSampleNote =
    usableCompCount >= 1 && usableCompCount <= 2
      ? "Limited matching sales found. Estimate may be less reliable."
      : null;

  return {
    kind: "ok",
    data: {
      card: {
        id: card.id,
        name: card.name,
        setName: card.setName ?? null,
        cardNumber: card.cardNumber ?? null,
        imageSmall: card.imageSmall,
        imageLarge: card.imageLarge,
        normalizedCardKey: card.normalizedCardKey,
      },
      conditionBucket,
      avgPrice: Number(existing.avgPrice),
      avgExcludedPrices,
      medianPrice: Number(existing.medianPrice),
      lowPrice: Number(existing.lowPrice),
      highPrice: Number(existing.highPrice),
      listingsCount: existing.listingsCount,
      usableCompCount,
      soldSampleStrength,
      limitedSampleNote,
      lastUpdated: existing.lastScrapedAt,
      isStale: isStaleFinal,
      isRefreshing: isRefreshingFinal,
      showFetchingBanner: showFetchingBannerFinal,
      lastScrapeError: existing.lastScrapeError,
      ebaySearchKeyword:
        resolveEbaySoldSearchKeywordForDisplay({
          storedKeyword: existing.ebaySearchKeyword,
          name: card.name,
          setName: card.setName,
          cardNumber: card.cardNumber,
          conditionBucket,
        }) || null,
      freeUpdatedLookups,
      snapshotInsights: snapshotInsights ?? {
        fairPriceLow: Number(existing.lowPrice),
        fairPriceHigh: Number(existing.highPrice),
        goodDealUnder: Number(existing.lowPrice),
        sellTarget: Number(existing.highPrice),
        confidence: "low",
        trend: null,
        headlineUsesCleanedComps: false,
        explainLine: "Uses sold prices, not active listings.",
      },
      listings,
    },
  };
}
