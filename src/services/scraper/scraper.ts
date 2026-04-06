import { getScrapingProvider } from "@/lib/scraping/provider";
import type { ScrapedActiveSnapshot, ScrapedCardSnapshot } from "@/lib/scraping/types";

/**
 * Scraper adapter interface (MVP).
 *
 * Returns the latest 5 SOLD eBay listings snapshot for MVP.
 */
export async function scrapeCardMarketData(input: {
  normalizedCardIdentifier: string;
  queryText: string;
}): Promise<ScrapedCardSnapshot> {
  const provider = getScrapingProvider();
  return provider.scrapeSoldSnapshot({
    normalizedCardIdentifier: input.normalizedCardIdentifier,
    queryText: input.queryText,
  });
}

export async function scrapeActiveMarketListings(input: {
  normalizedCardIdentifier: string;
  queryText: string;
  maxItems: number;
}): Promise<ScrapedActiveSnapshot> {
  const provider = getScrapingProvider();
  return provider.scrapeActiveListings({
    normalizedCardIdentifier: input.normalizedCardIdentifier,
    queryText: input.queryText,
    maxItems: input.maxItems,
  });
}
