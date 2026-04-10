import type { ScrapedCardSnapshot, ScrapingProvider } from "./types";
import { runEbaySoldListingsActor } from "@/services/apify/ebay-sold-listings.actor";

/**
 * Production Apify path: caffein.dev/ebay-sold-listings (see `APIFY_EBAY_SOLD_ACTOR_ID`).
 */
export const apifyScrapingProvider: ScrapingProvider = {
  async scrapeSoldSnapshot({ normalizedCardIdentifier, queryText, cacheKey, conditionBucket }): Promise<ScrapedCardSnapshot> {
    return runEbaySoldListingsActor({
      keyword: queryText,
      normalizedCardIdentifier,
      cacheKey,
      conditionBucket,
    });
  },
};
