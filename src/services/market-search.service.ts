import type { ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildCacheKey, normalizeCardKeyParts } from "@/lib/normalize";
import type { Entitlements } from "@/lib/billing/entitlements";
import { upsertCardFromApi } from "@/services/card-cache.service";
import { queueScrapeRefreshIfNeeded } from "@/services/scrape-queue.service";
import { logSoldScrapeMetric } from "@/services/apify/scrape-metrics";
import { waitForFreshSoldCache } from "@/services/sold-cache-wait.service";
import { processPendingScrapeJobs } from "@/services/scrape-worker.service";
import { computeDisplayedAveragePrice } from "@/lib/pricing/compute-displayed-average-price";
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
        lastUpdated: Date;
        isStale: boolean;
        isRefreshing: boolean;
        lastScrapeError?: string | null;
        ebaySearchKeyword: string | null;
        freeUpdatedLookups: null | { limit: number; used: number; remaining: number };
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
      /** Whether a background market update was queued (Collector or Starter hidden allowance). */
      isRefreshing: boolean;
      blockedReason?: "FREE_LIFETIME_SCRAPE_LIMIT";
      freeUpdatedLookups?: { limit: number; used: number; remaining: number };
    };

const COLLECTOR_QUEUE_PRIORITY = 1000;
const STARTER_QUEUE_PRIORITY = 200;

export async function searchCardMarketData(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  requestedConditionBucket: ConditionBucket;
  entitlements: Entitlements;
  userId?: string | null;
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

  const card = tier !== "preview"
    ? await upsertCardFromApi({
        name: input.name,
        setName: input.setName ?? null,
        cardNumber: input.cardNumber ?? null,
      })
    : await prisma.card.findUnique({
        where: { normalizedCardKey: normalizedKey },
      });

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
    };
  }

  const statsPre = await getCardSearchStats(card.normalizedCardKey);
  const policy = getCardCachePolicy(statsPre);
  const ttlMs = cachePolicyTtlMs(policy);
  await recordCardSearchEvent(card.normalizedCardKey, userId);

  const cacheKey = buildCacheKey(card.normalizedCardKey, conditionBucket);
  let existing = await prisma.cardCache.findUnique({
    where: { cacheKey },
    include: { listings: true },
  });

  const now = Date.now();
  const isFresh = existing ? now - existing.lastScrapedAt.getTime() < ttlMs : false;
  const isStale = existing ? !isFresh : true;

  let isRefreshing = false;
  if (isStale && input.entitlements.canTriggerRefresh) {
    logSoldScrapeMetric({
      event: "apify_ebay_sold",
      outcome: "cache_miss",
      cacheKey,
      normalizedQuery: cacheKey,
    });
    const queued = await queueScrapeRefreshIfNeeded({
      cardId: card.id,
      conditionBucket,
      cacheKey,
      requestedByUserId: userId,
      priority: COLLECTOR_QUEUE_PRIORITY,
    });
    isRefreshing = queued.didQueue || queued.alreadyQueued;
  }

  // Starter: allow up to 3 lifetime updated lookups (scrape runs) when cache is missing or stale.
  if (isStale && tier === "starter" && userId) {
    const entitlement = await getFreshScrapeEntitlementForUser({ tier, userId });
    if (entitlement.allowed) {
      const queued = await queueStarterFreshScrapeIfAllowed({
        userId,
        cardId: card.id,
        conditionBucket,
        cacheKey,
        priority: STARTER_QUEUE_PRIORITY,
      });
      isRefreshing = queued.kind === "queued" || queued.kind === "already_queued";
    }
  }

  const cacheStatus: "hit" | "stale" | "miss" = !existing ? "miss" : isFresh ? "hit" : "stale";
  logCachePolicyDecision({
    normalizedCardKey: card.normalizedCardKey,
    temperature: policy.temperature,
    ttlHours: policy.ttlHours,
    reasons: policy.reasons,
    cacheStatus,
    refreshTriggered: isRefreshing,
  });

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
        isRefreshing,
      };
    } else if (tier === "starter" && userId) {
      // Run the worker before re-checking entitlements: queueing a refresh reserves a credit, so
      // `remaining` can be 0 until the job consumes or refunds. Otherwise we'd return FREE_LIFETIME_SCRAPE_LIMIT
      // without ever running the worker — leaving `ScrapeJob` pending and `freeLifetimeUpdatedLookupsReserved` stuck.
      if (isRefreshing) {
        await processPendingScrapeJobs({ limit: 1 });
        await waitForFreshSoldCache({ cacheKey, ttlMs });
        existing = await prisma.cardCache.findUnique({
          where: { cacheKey },
          include: { listings: true },
        });
      }

      const ent = await getFreshScrapeEntitlementForUser({ tier, userId });
      const counts =
        ent.limit != null && ent.used != null && ent.remaining != null
          ? { limit: ent.limit, used: ent.used, remaining: ent.remaining }
          : undefined;
      // After the last lifetime scrape succeeds, `used === limit` so `allowed` is false, but we already
      // have `existing` cache — still show results instead of FREE_LIFETIME_SCRAPE_LIMIT.
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
          isRefreshing,
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
      };
    }
  }

  await prisma.cardCache.update({
    where: { id: existing.id },
    data: { lastReturnedAt: new Date() },
  });

  const nowOk = Date.now();
  const cacheIsFresh = nowOk - existing.lastScrapedAt.getTime() < ttlMs;
  const isStaleFinal = !cacheIsFresh;
  const isRefreshingFinal = cacheIsFresh ? false : isRefreshing;

  const starterCounts =
    tier === "starter" && userId
      ? await getFreshScrapeEntitlementForUser({ tier, userId })
      : null;
  const freeUpdatedLookups =
    starterCounts && starterCounts.limit != null && starterCounts.used != null && starterCounts.remaining != null
      ? { limit: starterCounts.limit, used: starterCounts.used, remaining: starterCounts.remaining }
      : null;

  if (cacheIsFresh) {
    logSoldScrapeMetric({
      event: "apify_ebay_sold",
      outcome: "cache_hit",
      cacheKey,
      normalizedQuery: existing.ebaySearchKeyword ?? cacheKey,
    });
  }

  const visible = existing.listings
    .sort((a, b) => a.position - b.position)
    .slice(0, input.entitlements.recentSalesVisibleCount);

  const listings =
    input.entitlements.recentSalesVisibleCount > 0
      ? visible.map((l) => ({
          title: l.title,
          source: l.source,
          soldPrice: Number(l.soldPrice),
          soldDate: l.soldDate,
          listingUrl: l.listingUrl,
          conditionLabel: l.conditionLabel,
          gradeLabel: l.gradeLabel,
          rawOrGraded: l.rawOrGraded,
          position: l.position,
        }))
      : [];

  const pricing = computeDisplayedAveragePrice(existing.listings.map((l) => Number(l.soldPrice)));
  const avgExcludedPrices =
    pricing.pricingMethod === "trimmed_mean_5" && pricing.excludedPrices.length > 0
      ? pricing.excludedPrices
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
      lastUpdated: existing.lastScrapedAt,
      isStale: isStaleFinal,
      isRefreshing: isRefreshingFinal,
      lastScrapeError: existing.lastScrapeError,
      ebaySearchKeyword: existing.ebaySearchKeyword ?? null,
      freeUpdatedLookups,
      listings,
    },
  };
}
