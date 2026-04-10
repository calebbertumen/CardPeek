import type { ConditionBucket } from "@prisma/client";
import { getScrapingProvider } from "@/lib/scraping/provider";
import type { ScrapedCardSnapshot } from "@/lib/scraping/types";

/**
 * Scraper adapter interface (MVP).
 *
 * Returns the latest 5 SOLD eBay listings snapshot for MVP.
 */
export async function scrapeCardMarketData(input: {
  normalizedCardIdentifier: string;
  queryText: string;
  conditionBucket: ConditionBucket;
  cacheKey?: string;
}): Promise<ScrapedCardSnapshot> {
  const provider = getScrapingProvider();
  return provider.scrapeSoldSnapshot({
    normalizedCardIdentifier: input.normalizedCardIdentifier,
    queryText: input.queryText,
    conditionBucket: input.conditionBucket,
    cacheKey: input.cacheKey,
  });
}
