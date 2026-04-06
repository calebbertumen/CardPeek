import type { ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CACHE_TTL_MS } from "@/lib/constants";
import { buildCacheKey, normalizeCardKeyParts } from "@/lib/normalize";
import type { Entitlements } from "@/lib/billing/entitlements";
import { upsertCardFromApi } from "@/services/card-cache.service";
import { queueScrapeRefreshIfNeeded } from "@/services/scrape-queue.service";
import {
  refundStarterHiddenLiveFetch,
  tryConsumeStarterHiddenLiveFetch,
} from "@/services/starter-hidden-live-usage.service";

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
        medianPrice: number;
        lowPrice: number;
        highPrice: number;
        listingsCount: number;
        lastUpdated: Date;
        isStale: boolean;
        isRefreshing: boolean;
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
    };

const COLLECTOR_QUEUE_PRIORITY = 1000;
const STARTER_HIDDEN_QUEUE_PRIORITY = 200;

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
  let starterHiddenConsumed = false;

  let card = input.entitlements.canTriggerRefresh
    ? await upsertCardFromApi({
        name: input.name,
        setName: input.setName ?? null,
        cardNumber: input.cardNumber ?? null,
      })
    : await prisma.card.findUnique({
        where: { normalizedCardKey: normalizedKey },
      });

  if (!card && tier === "starter" && userId) {
    const allowed = await tryConsumeStarterHiddenLiveFetch(userId);
    if (!allowed) {
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
    starterHiddenConsumed = true;
    try {
      card = await upsertCardFromApi({
        name: input.name,
        setName: input.setName ?? null,
        cardNumber: input.cardNumber ?? null,
      });
    } catch (e) {
      await refundStarterHiddenLiveFetch(userId);
      starterHiddenConsumed = false;
      if (e instanceof Error && e.message === "CARD_NOT_FOUND") {
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
      throw e;
    }
  }

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

  const cacheKey = buildCacheKey(card.normalizedCardKey, conditionBucket);
  const existing = await prisma.cardCache.findUnique({
    where: { cacheKey },
    include: { listings: true },
  });

  const now = Date.now();
  const isFresh = existing ? now - existing.lastScrapedAt.getTime() < CACHE_TTL_MS : false;
  const isStale = existing ? !isFresh : true;

  let isRefreshing = false;
  if (isStale && input.entitlements.canTriggerRefresh) {
    const queued = await queueScrapeRefreshIfNeeded({
      cardId: card.id,
      conditionBucket,
      cacheKey,
      requestedByUserId: userId,
      priority: COLLECTOR_QUEUE_PRIORITY,
    });
    isRefreshing = queued.didQueue || queued.alreadyQueued;
  }

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
    }

    if (tier === "starter" && userId) {
      if (!starterHiddenConsumed) {
        const allowed = await tryConsumeStarterHiddenLiveFetch(userId);
        if (!allowed) {
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
        starterHiddenConsumed = true;
      }
      const queued = await queueScrapeRefreshIfNeeded({
        cardId: card.id,
        conditionBucket,
        cacheKey,
        requestedByUserId: userId,
        priority: STARTER_HIDDEN_QUEUE_PRIORITY,
      });
      isRefreshing = queued.didQueue || queued.alreadyQueued;
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

  await prisma.cardCache.update({
    where: { id: existing.id },
    data: { lastReturnedAt: new Date() },
  });

  const visible = existing.listings
    .sort((a, b) => a.position - b.position)
    .slice(0, input.entitlements.recentSalesVisibleCount);

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
      medianPrice: Number(existing.medianPrice),
      lowPrice: Number(existing.lowPrice),
      highPrice: Number(existing.highPrice),
      listingsCount: existing.listingsCount,
      lastUpdated: existing.lastScrapedAt,
      isStale,
      isRefreshing,
      listings: visible.map((l) => ({
        title: l.title,
        source: l.source,
        soldPrice: Number(l.soldPrice),
        soldDate: l.soldDate,
        listingUrl: l.listingUrl,
        conditionLabel: l.conditionLabel,
        gradeLabel: l.gradeLabel,
        rawOrGraded: l.rawOrGraded,
        position: l.position,
      })),
    },
  };
}
