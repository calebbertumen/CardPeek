import type { ConditionBucket, ScrapeJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scrapeCardMarketData } from "@/services/scraper/scraper";
import { Prisma } from "@prisma/client";
import { ensureCardVariantForCard } from "@/services/card-normalization.service";
import { tryAcquireScrapeLock, releaseScrapeLock } from "@/lib/scrape/scrape-lock";
import { buildEbaySoldSearchKeyword } from "@/lib/search/sold-search-query";
import { logSoldScrapeMetric } from "@/services/apify/scrape-metrics";
import {
  consumeReservedFreeUpdatedLookupCredit,
  refundReservedFreeUpdatedLookupCredit,
} from "@/services/fresh-scrape-usage.service";

function storeRawPayload(): boolean {
  return process.env.SCRAPING_STORE_RAW_PAYLOAD === "true";
}

/** Pending jobs older than this never got a worker claim — release Starter reservations. */
const STALE_PENDING_MS = 30 * 60 * 1000;
/** Running jobs stuck (e.g. serverless timeout mid-scrape) — refund so credits aren’t held forever. */
const STALE_RUNNING_MS = 45 * 60 * 1000;

async function failStalePendingSoldJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_PENDING_MS);
  const stale = await prisma.scrapeJob.findMany({
    where: {
      kind: "sold",
      status: "pending",
      createdAt: { lt: cutoff },
    },
    select: { id: true, requestedByUserId: true },
  });
  for (const job of stale) {
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: "STALE_PENDING_JOB",
      },
    });
    if (job.requestedByUserId) {
      await refundReservedFreeUpdatedLookupCredit(job.requestedByUserId);
    }
  }
}

export async function cleanupStaleSoldScrapeJobs(): Promise<void> {
  await failStalePendingSoldJobs();
  await failStaleRunningSoldJobs();
}

async function failStaleRunningSoldJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_RUNNING_MS);
  const stale = await prisma.scrapeJob.findMany({
    where: {
      kind: "sold",
      status: "running",
      updatedAt: { lt: cutoff },
    },
    select: { id: true, requestedByUserId: true, cacheKey: true },
  });
  for (const job of stale) {
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: "STALE_RUNNING_JOB",
      },
    });
    if (job.requestedByUserId) {
      await refundReservedFreeUpdatedLookupCredit(job.requestedByUserId);
    }
    await prisma.cardCache.updateMany({
      where: { cacheKey: job.cacheKey },
      data: { lastScrapeError: "STALE_RUNNING_JOB" },
    });
  }
}

export async function processPendingScrapeJobs(input?: { limit?: number }): Promise<{
  processed: number;
  completed: number;
  failed: number;
}> {
  const limit = Math.min(Math.max(input?.limit ?? 3, 1), 10);
  let processed = 0;
  let completed = 0;
  let failed = 0;

  await cleanupStaleSoldScrapeJobs();

  for (let i = 0; i < limit; i += 1) {
    const next = await prisma.scrapeJob.findFirst({
      where: { status: "pending", kind: "sold" },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        cardId: true,
        conditionBucket: true,
        cacheKey: true,
        requestedByUserId: true,
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

      const keyword = buildEbaySoldSearchKeyword({
        name: card.name,
        setName: card.setName,
        cardNumber: card.cardNumber,
        conditionBucket: next.conditionBucket as ConditionBucket,
      });

      const scraped = await scrapeCardMarketData({
        normalizedCardIdentifier: card.normalizedCardKey,
        queryText: keyword,
        conditionBucket: next.conditionBucket as ConditionBucket,
        cacheKey: next.cacheKey,
      });

      const listings = scraped.soldListings.slice(0, 5);
      const n = listings.length;

      const cache = await prisma.$transaction(async (tx) => {
        const c = await tx.cardCache.upsert({
          where: { cacheKey: next.cacheKey },
          create: {
            cardId: card.id,
            cardVariantId: variant.id,
            conditionBucket: next.conditionBucket as ConditionBucket,
            cacheKey: next.cacheKey,
            ebaySearchKeyword: keyword,
            avgPrice: new Prisma.Decimal(scraped.averagePrice.toFixed(2)),
            medianPrice: new Prisma.Decimal(scraped.medianPrice.toFixed(2)),
            lowPrice: new Prisma.Decimal(scraped.minPrice.toFixed(2)),
            highPrice: new Prisma.Decimal(scraped.maxPrice.toFixed(2)),
            listingsCount: n,
            lastScrapedAt: scraped.scrapedAt,
            lastReturnedAt: null,
            lastScrapeError: null,
          },
          update: {
            cardVariantId: variant.id,
            ebaySearchKeyword: keyword,
            avgPrice: new Prisma.Decimal(scraped.averagePrice.toFixed(2)),
            medianPrice: new Prisma.Decimal(scraped.medianPrice.toFixed(2)),
            lowPrice: new Prisma.Decimal(scraped.minPrice.toFixed(2)),
            highPrice: new Prisma.Decimal(scraped.maxPrice.toFixed(2)),
            listingsCount: n,
            lastScrapedAt: scraped.scrapedAt,
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

        return tx.cardCache.findUniqueOrThrow({
          where: { id: c.id },
        });
      });

      if (n > 0) {
        await prisma.priceHistoryPoint.createMany({
          data: [7, 30].map((periodDays) => ({
            cardId: card.id,
            periodDays,
            price: new Prisma.Decimal(Number(cache.avgPrice).toFixed(2)),
            recordedAt: cache.lastScrapedAt,
          })),
          skipDuplicates: false,
        });
      }

      if (next.requestedByUserId) {
        await consumeReservedFreeUpdatedLookupCredit(next.requestedByUserId);
      }

      await prisma.scrapeJob.update({
        where: { id: next.id },
        data: { status: "completed", completedAt: new Date(), error: null },
      });

      completed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (next.requestedByUserId) {
        await refundReservedFreeUpdatedLookupCredit(next.requestedByUserId);
      }

      await prisma.scrapeJob.update({
        where: { id: next.id },
        data: { status: "failed", completedAt: new Date(), error: msg.slice(0, 500) },
      });
      failed += 1;

      await prisma.cardCache.updateMany({
        where: { cacheKey: next.cacheKey },
        data: { lastScrapeError: msg.slice(0, 500) },
      });

      logSoldScrapeMetric({
        event: "apify_ebay_sold",
        outcome: "apify_run_failure",
        cacheKey: next.cacheKey,
        error: msg.slice(0, 200),
      });
    } finally {
      if (lockHeld) {
        await releaseScrapeLock({ scope: "sold", lockKey: next.cacheKey });
      }
    }
  }

  return { processed, completed, failed };
}
