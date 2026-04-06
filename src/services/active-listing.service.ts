import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { scrapeActiveMarketListings } from "@/services/scraper/scraper";
import {
  getActiveFetchMaxRetries,
  getActiveListingsMaxPerScrape,
} from "@/lib/scrape/config";
import { totalListingCost } from "@/lib/pricing/total-cost";
import { tryAcquireScrapeLock, releaseScrapeLock } from "@/lib/scrape/scrape-lock";

/**
 * Watchlist-only: fetch active (BIN) listings for a canonical variant and replace snapshot rows.
 * Cost: one provider call per variant, shared by all users watching that variant.
 */
export async function fetchAndPersistActiveListingsForVariant(input: {
  cardVariantId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const variant = await prisma.cardVariant.findUnique({
    where: { id: input.cardVariantId },
    include: {
      card: {
        select: {
          normalizedCardKey: true,
          name: true,
          setName: true,
          cardNumber: true,
        },
      },
    },
  });

  if (!variant) return { ok: false, error: "card_variant_not_found" };

  const acquired = await tryAcquireScrapeLock({
    scope: "active",
    lockKey: variant.canonicalKey,
  });
  if (!acquired) return { ok: false, error: "locked" };

  const maxItems = getActiveListingsMaxPerScrape();
  const queryText = [variant.card.name, variant.card.setName, variant.card.cardNumber]
    .filter(Boolean)
    .join(" ");

  let lastErr = "unknown";
  const retries = getActiveFetchMaxRetries();

  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const scraped = await scrapeActiveMarketListings({
          normalizedCardIdentifier: variant.card.normalizedCardKey,
          queryText,
          maxItems,
        });

        await prisma.$transaction(async (tx) => {
          const snap = await tx.activeListingSnapshot.upsert({
            where: { cardVariantId: variant.id },
            create: {
              cardVariantId: variant.id,
              lastScrapedAt: scraped.scrapedAt,
            },
            update: {
              lastScrapedAt: scraped.scrapedAt,
            },
          });

          await tx.activeListingRow.deleteMany({ where: { activeListingSnapshotId: snap.id } });

          if (scraped.listings.length > 0) {
            await tx.activeListingRow.createMany({
              data: scraped.listings.map((l, i) => {
                const ship =
                  l.shippingPrice === null || l.shippingPrice === undefined
                    ? null
                    : new Prisma.Decimal(Number(l.shippingPrice).toFixed(2));
                const total = totalListingCost(l.price, l.shippingPrice ?? null);
                return {
                  activeListingSnapshotId: snap.id,
                  title: l.title,
                  price: new Prisma.Decimal(Number(l.price).toFixed(2)),
                  shippingPrice: ship,
                  totalPrice: new Prisma.Decimal(total.toFixed(2)),
                  currency: l.currency ?? "USD",
                  listingUrl: l.listingUrl,
                  itemId: l.itemId ?? null,
                  sellerLabel: l.sellerLabel ?? null,
                  isBuyItNow: l.isBuyItNow !== false,
                  rawPayload: (l.raw ?? null) as Prisma.InputJsonValue,
                  position: i + 1,
                };
              }),
            });
          }
        });

        return { ok: true };
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    return { ok: false, error: lastErr.slice(0, 500) };
  } finally {
    await releaseScrapeLock({ scope: "active", lockKey: variant.canonicalKey });
  }
}
