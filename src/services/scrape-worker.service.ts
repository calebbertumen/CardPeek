import type { ConditionBucket, ScrapeJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scrapeCardMarketData } from "@/services/scraper/scraper";
import { Prisma } from "@prisma/client";
import { evaluatePriceAlertsForCard } from "@/services/price-alerts.service";
import { ensureCardVariantForCard } from "@/services/card-normalization.service";
import { fetchAndPersistActiveListingsForVariant } from "@/services/active-listing.service";
import { evaluateWatchlistForActiveSnapshot } from "@/services/watchlist-evaluation.service";
import { tryAcquireScrapeLock, releaseScrapeLock } from "@/lib/scrape/scrape-lock";
import { isPiggybackActiveOnSoldEnabled } from "@/lib/scrape/config";

export async function processPendingScrapeJobs(input?: { limit?: number }): Promise<{
  processed: number;
  completed: number;
  failed: number;
}> {
  const limit = Math.min(Math.max(input?.limit ?? 3, 1), 10);
  let processed = 0;
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < limit; i += 1) {
    const next = await prisma.scrapeJob.findFirst({
      where: { status: "pending", kind: "sold" },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        cardId: true,
        conditionBucket: true,
        cacheKey: true,
      },
    });

    if (!next) break;

    const claimed = await prisma.scrapeJob.updateMany({
      where: { id: next.id, status: "pending" },
      data: { status: "running" satisfies ScrapeJobStatus },
    });
    if (claimed.count === 0) continue;

    processed += 1;

    let lockHeld = false;
    let completedVariantId: string | null = null;
    try {
      const card = await prisma.card.findUniqueOrThrow({
        where: { id: next.cardId },
        select: {
          id: true,
          name: true,
          setName: true,
          cardNumber: true,
          normalizedCardKey: true,
          imageSmall: true,
          imageLarge: true,
        },
      });

      const variant = await ensureCardVariantForCard({
        card,
        conditionBucket: next.conditionBucket as ConditionBucket,
      });

      const lockOk = await tryAcquireScrapeLock({ scope: "sold", lockKey: next.cacheKey });
      if (!lockOk) {
        await prisma.scrapeJob.update({
          where: { id: next.id },
          data: { status: "pending" },
        });
        processed -= 1;
        continue;
      }
      lockHeld = true;

      const scraped = await scrapeCardMarketData({
        normalizedCardIdentifier: card.normalizedCardKey,
        queryText: [card.name, card.setName, card.cardNumber].filter(Boolean).join(" "),
      });

      const cache = await prisma.$transaction(async (tx) => {
        const c = await tx.cardCache.upsert({
          where: { cacheKey: next.cacheKey },
          create: {
            cardId: card.id,
            cardVariantId: variant.id,
            conditionBucket: next.conditionBucket as ConditionBucket,
            cacheKey: next.cacheKey,
            avgPrice: new Prisma.Decimal(scraped.averagePrice.toFixed(2)),
            medianPrice: new Prisma.Decimal(scraped.averagePrice.toFixed(2)),
            lowPrice: new Prisma.Decimal(scraped.minPrice.toFixed(2)),
            highPrice: new Prisma.Decimal(scraped.maxPrice.toFixed(2)),
            listingsCount: 5,
            lastScrapedAt: scraped.scrapedAt,
            lastReturnedAt: null,
          },
          update: {
            cardVariantId: variant.id,
            avgPrice: new Prisma.Decimal(scraped.averagePrice.toFixed(2)),
            medianPrice: new Prisma.Decimal(scraped.averagePrice.toFixed(2)),
            lowPrice: new Prisma.Decimal(scraped.minPrice.toFixed(2)),
            highPrice: new Prisma.Decimal(scraped.maxPrice.toFixed(2)),
            listingsCount: 5,
            lastScrapedAt: scraped.scrapedAt,
          },
        });

        await tx.cardCacheListing.deleteMany({ where: { cardCacheId: c.id } });
        await tx.cardCacheListing.createMany({
          data: scraped.soldListings.slice(0, 5).map((l, i) => ({
            cardCacheId: c.id,
            title: l.title,
            source: "ebay",
            soldPrice: new Prisma.Decimal(l.soldPrice.toFixed(2)),
            soldDate: l.soldAt,
            listingUrl: l.itemUrl ?? "",
            itemId: l.itemId ?? null,
            imageUrl: l.imageUrl ?? null,
            rawPayload: (l.raw ?? null) as Prisma.InputJsonValue,
            conditionLabel: null,
            gradeLabel: null,
            rawOrGraded: null,
            position: i + 1,
          })),
        });

        return tx.cardCache.findUniqueOrThrow({
          where: { id: c.id },
        });
      });

      // Create simple history points (MVP): record the new avg at scrape time.
      await prisma.priceHistoryPoint.createMany({
        data: [7, 30].map((periodDays) => ({
          cardId: card.id,
          periodDays,
          price: new Prisma.Decimal(Number(cache.avgPrice).toFixed(2)),
          recordedAt: cache.lastScrapedAt,
        })),
        skipDuplicates: false,
      });

      await evaluatePriceAlertsForCard({
        cardId: card.id,
        conditionBucket: next.conditionBucket as ConditionBucket,
        newAvgPrice: Number(cache.avgPrice),
      });

      await prisma.scrapeJob.update({
        where: { id: next.id },
        data: { status: "completed", completedAt: new Date(), error: null },
      });

      completed += 1;
      completedVariantId = variant.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await prisma.scrapeJob.update({
        where: { id: next.id },
        data: { status: "failed", completedAt: new Date(), error: msg.slice(0, 500) },
      });
      failed += 1;
    } finally {
      if (lockHeld) {
        await releaseScrapeLock({ scope: "sold", lockKey: next.cacheKey });
      }
    }

    if (completedVariantId && isPiggybackActiveOnSoldEnabled()) {
      const watchCount = await prisma.watchlistItem.count({
        where: { cardVariantId: completedVariantId, alertEnabled: true },
      });
      if (watchCount > 0) {
        const activeRes = await fetchAndPersistActiveListingsForVariant({
          cardVariantId: completedVariantId,
        });
        if (activeRes.ok) {
          await evaluateWatchlistForActiveSnapshot({ cardVariantId: completedVariantId });
        }
      }
    }
  }

  return { processed, completed, failed };
}

